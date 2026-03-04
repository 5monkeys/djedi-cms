#![warn(clippy::pedantic)]

use pulldown_cmark::{html, Options, Parser};
use swc_core::common::pass::Repeated;
use swc_core::common::{Spanned, DUMMY_SP};
use swc_core::ecma::ast::Pass;
use swc_core::ecma::ast::{
    CallExpr, Callee, Expr, ExprOrSpread, ExprStmt, Ident, IdentName, ImportDecl,
    ImportNamedSpecifier, ImportSpecifier, JSXText, KeyValueProp, Lit, MemberExpr, MemberProp,
    ModuleDecl, ModuleItem, Null, ObjectLit, Prop, PropOrSpread, Str, TaggedTpl, Tpl,
};
use swc_core::ecma::utils::{prepend_stmt, prepend_stmts, private_ident, quote_ident};
use swc_core::ecma::visit::Fold;
use swc_core::ecma::{
    ast::{
        JSXAttrName, JSXAttrOrSpread, JSXAttrValue, JSXElement, JSXElementChild, JSXElementName,
        JSXExpr, JSXExprContainer, Program,
    },
    transforms::testing::test,
    visit::FoldWith,
};
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};

#[cfg(test)]
use swc_core::common::errors::HANDLER;

#[cfg(not(test))]
use swc_core::plugin::errors::HANDLER;

const COMPONENT_NAME: &str = "Node";
const DJEDI_REACT_PACKAGE: &str = "djedi-react";
const MARKDOWN_TAG: &str = "md";

/// Dedent a string by removing common leading whitespace from all lines.
/// This mimics the behavior of the dedent-js library used in the babel plugin.
fn dedent(s: &str) -> String {
    let lines: Vec<&str> = s.lines().collect();

    if lines.is_empty() {
        return String::new();
    }

    // Find the minimum indentation (excluding empty lines)
    let min_indent = lines
        .iter()
        .filter(|line| !line.trim().is_empty())
        .map(|line| line.len() - line.trim_start().len())
        .min()
        .unwrap_or(0);

    // Remove the common indentation from all lines
    lines
        .iter()
        .map(|line| {
            if line.trim().is_empty() {
                ""
            } else if line.len() >= min_indent {
                &line[min_indent..]
            } else {
                line
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

/// Convert markdown to HTML using pulldown-cmark.
fn markdown_to_html(markdown: &str) -> String {
    let options = Options::empty();
    let parser = Parser::new_ext(markdown, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);

    // Remove the wrapping <p> tags if present and trim
    html_output = html_output.trim().to_string();
    if html_output.starts_with("<p>") && html_output.ends_with("</p>") {
        html_output = html_output[3..html_output.len() - 4].to_string();
    }

    html_output
}

#[derive(Debug)]
struct Node {
    uri: Box<Expr>,
    /// The default value of the node.
    value: Option<Box<Expr>>,
}

impl TryFrom<&JSXElement> for Node {
    type Error = ();

    fn try_from(element: &JSXElement) -> Result<Self, Self::Error> {
        let uri = uri_attr(element).ok_or(())?;
        let value = default_value(element);

        Ok(Node { uri, value })
    }
}

fn is_djedi_node(n: &JSXElement) -> bool {
    match n.opening.name {
        JSXElementName::Ident(ref ident) => ident.sym.as_ref() == COMPONENT_NAME,
        JSXElementName::JSXMemberExpr(_) | JSXElementName::JSXNamespacedName(_) => false,
    }
}

fn uri_attr(e: &JSXElement) -> Option<Box<Expr>> {
    let value = e.opening.attrs.iter().find_map(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) => match attr.name {
            JSXAttrName::Ident(ref ident) => {
                if ident.sym.as_ref() == "uri" {
                    attr.value.as_ref()
                } else {
                    None
                }
            }
            JSXAttrName::JSXNamespacedName(_) => None,
        },
        JSXAttrOrSpread::SpreadElement(_) => None,
    });

    let Some(value) = value else {
        HANDLER.with(|handler| {
            handler
                .struct_span_warn(
                    e.span,
                    "not prefetched because no `uri` attribute was found",
                )
                .emit();
        });
        return None;
    };

    let expr = value.as_string_content().map(|content| content.to_expr());

    if expr.is_none() {
        HANDLER.with(|handler| {
            handler
                .struct_span_warn(
                    value.span(),
                    "`uri` attribute must be known at build time for the node to be prefetched",
                )
                .emit();
        });
    }

    expr
}

#[derive(Debug)]
enum StringContent {
    /// Plain text content
    Plain(String),
    /// Markdown content that should be converted to HTML
    Markdown(String),
}

impl StringContent {
    fn to_expr(&self) -> Box<Expr> {
        match self {
            StringContent::Plain(s) => Box::new(Expr::Lit(Lit::Str(Str {
                span: DUMMY_SP,
                value: dedent(s).into(),
                raw: None,
            }))),
            StringContent::Markdown(s) => {
                let dedented = dedent(s);
                let html = markdown_to_html(&dedented);
                Box::new(Expr::Lit(Lit::Str(Str {
                    span: DUMMY_SP,
                    value: html.into(),
                    raw: None,
                })))
            }
        }
    }
}

trait AsStringContent {
    fn as_string_content(&self) -> Option<StringContent>;
}

impl AsStringContent for Lit {
    fn as_string_content(&self) -> Option<StringContent> {
        match self {
            Lit::Str(Str { value, .. }) | Lit::JSXText(JSXText { value, .. }) => {
                Some(StringContent::Plain(value.to_string()))
            }
            _ => None,
        }
    }
}

impl AsStringContent for JSXExprContainer {
    fn as_string_content(&self) -> Option<StringContent> {
        fn tpl_to_content(tpl: &Tpl, is_markdown: bool) -> Option<StringContent> {
            // only allow template literals without substitutions
            if tpl.exprs.is_empty() && tpl.quasis.len() == 1 {
                let content = tpl.quasis[0].raw.to_string();
                Some(if is_markdown {
                    StringContent::Markdown(content)
                } else {
                    StringContent::Plain(content)
                })
            } else {
                None
            }
        }

        match &self.expr {
            JSXExpr::Expr(e) => match e.as_ref() {
                Expr::Lit(lit) => lit.as_string_content(),
                Expr::Tpl(tpl) => tpl_to_content(tpl, false),
                Expr::TaggedTpl(TaggedTpl { tag, tpl, .. }) => match tag.as_ref() {
                    Expr::Ident(ident) if ident.sym.as_str() == MARKDOWN_TAG => {
                        tpl_to_content(tpl, true)
                    }
                    _ => None,
                },
                _ => None,
            },
            JSXExpr::JSXEmptyExpr(_) => None,
        }
    }
}

impl AsStringContent for JSXAttrValue {
    fn as_string_content(&self) -> Option<StringContent> {
        match self {
            JSXAttrValue::JSXExprContainer(exp) => exp.as_string_content(),
            JSXAttrValue::Lit(lit) => lit.as_string_content(),
            JSXAttrValue::JSXElement(_) | JSXAttrValue::JSXFragment(_) => None,
        }
    }
}

fn default_value(element: &JSXElement) -> Option<Box<Expr>> {
    let mut children = element.children.iter().filter(|child| match child {
        JSXElementChild::JSXText(t) => !t.value.trim().is_empty(),
        JSXElementChild::JSXExprContainer(JSXExprContainer { span: _, expr }) => match expr {
            JSXExpr::Expr(_) => true,
            JSXExpr::JSXEmptyExpr(_) => false, // ignore empty expressions (including comments)
        },
        _ => true,
    });

    match (children.next(), children.next()) {
        (Some(JSXElementChild::JSXText(t)), None) => {
            let content = StringContent::Plain(t.value.to_string());
            Some(content.to_expr())
        }
        (Some(JSXElementChild::JSXExprContainer(container)), None) => container
            .as_string_content()
            .map(|content| content.to_expr()),
        (Some(c), None) => {
            HANDLER.with(|handler| {
                handler
                    .struct_span_err(
                        c.span(),
                        &format!(
                            "<{COMPONENT_NAME} /> must have text or an expression as its child"
                        ),
                    )
                    .emit();
            });
            None
        }
        (Some(_), Some(_)) => {
            HANDLER.with(|handler| {
                handler
                    .struct_span_err(
                        element.span,
                        &format!("<{COMPONENT_NAME} /> cannot have more than one child"),
                    )
                    .emit();
            });
            None
        }
        (None, None) => None,
        (None, Some(_)) => unreachable!(),
    }
}

#[derive(Debug, Default)]
struct Transformer {
    nodes: Vec<Node>,
}

/// Make a call to `djedi.reportPrefetchableNode`.
///
/// Something like:
/// ```js
/// djedi.reportPrefetchableNode({
///   uri: "foo",
///   value: "bar",
/// });
/// ```
fn make_report_call(node: &Node, local_djedi: &Ident) -> ModuleItem {
    ModuleItem::Stmt(
        ExprStmt {
            span: DUMMY_SP,
            expr: CallExpr {
                span: DUMMY_SP,
                callee: Callee::Expr(
                    MemberExpr {
                        span: DUMMY_SP,
                        obj: local_djedi.clone().into(),
                        prop: MemberProp::Ident(IdentName::new(
                            "reportPrefetchableNode".into(),
                            DUMMY_SP,
                        )),
                    }
                    .into(),
                ),
                args: vec![ExprOrSpread {
                    spread: None,
                    expr: ObjectLit {
                        span: DUMMY_SP,
                        props: vec![
                            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                                key: quote_ident!("uri").into(),
                                value: node.uri.clone(),
                            }))),
                            PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                                key: quote_ident!("value").into(),
                                value: match node.value {
                                    Some(ref value) => value.clone(),
                                    None => Null { span: DUMMY_SP }.into(),
                                },
                            }))),
                        ],
                    }
                    .into(),
                }],
                ..Default::default()
            }
            .into(),
        }
        .into(),
    )
}

impl Repeated for Transformer {
    fn changed(&self) -> bool {
        false
    }

    fn reset(&mut self) {
        self.nodes.clear();
    }
}

impl Pass for Transformer {
    fn process(&mut self, program: &mut Program) {
        *program = program.clone().fold_with(self);
    }
}

impl Fold for Transformer {
    fn fold_jsx_element(&mut self, n: JSXElement) -> JSXElement {
        if is_djedi_node(&n) {
            if let Ok(node) = Node::try_from(&n) {
                self.nodes.push(node);
            }
        }
        n.fold_children_with(self)
    }

    fn fold_module_items(&mut self, items: Vec<ModuleItem>) -> Vec<ModuleItem> {
        self.nodes = Vec::new();

        let mut items = items.fold_children_with(self);

        if self.nodes.is_empty() {
            return items;
        }

        let local_djedi = private_ident!("djedi");

        prepend_stmts(
            &mut items,
            self.nodes.iter().map(|n| make_report_call(n, &local_djedi)),
        );

        // import { djedi as <...> } from "djedi-react";
        prepend_stmt(
            &mut items,
            ModuleItem::ModuleDecl(ModuleDecl::Import(ImportDecl {
                span: DUMMY_SP,
                specifiers: vec![ImportSpecifier::Named(ImportNamedSpecifier {
                    span: DUMMY_SP,
                    local: local_djedi.clone(),
                    imported: Some(quote_ident!("djedi").into()),
                    is_type_only: false,
                })],
                src: Box::new(DJEDI_REACT_PACKAGE.into()),
                type_only: false,
                with: None,
                phase: Default::default(),
            })),
        );

        items
    }
}

#[plugin_transform]
#[allow(clippy::needless_pass_by_value)]
pub fn process_transform(program: Program, _metadata: TransformPluginProgramMetadata) -> Program {
    program.fold_with(&mut Transformer::default())
}

#[cfg(test)]
fn jsx_syntax() -> swc_ecma_parser::Syntax {
    swc_ecma_parser::Syntax::Es(swc_ecma_parser::EsSyntax {
        jsx: true,
        ..Default::default()
    })
}

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    template_literal,
    r#"<Node uri="foo">{`simple template literal`}</Node>"#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    tagged_template_literal,
    r#"<Node uri="foo">{tag`hello world`}</Node>"#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    markdown_template_literal,
    r#"<Node uri="foo">{md`**Markdown**`}</Node>"#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    markdown_with_links,
    r#"(<div>
      <Node uri="test/text.md">{md`
        [Cargo.toml,](./Cargo.toml)
       [Cargo.lock,](./Cargo.lock)
      `}</Node>
      <Node uri="test/search.md">{md`
        [Google](https://www.google.com)
        [Bing](https://www.bing.com)
      `}</Node>
    </div>);
"#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    directives,
    r#"
        "use strict";
        <Node uri="foo">default value</Node>
    "#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    nodes,
    include_str!("../tests/input.js")
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    simple_node_with_text,
    r#"<Node uri="example">Hello World</Node>"#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    simple_node_without_default,
    r#"<Node uri="test/uri" />"#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    multiple_nodes,
    r#"
    <div>
        <Node uri="header">Header Text</Node>
        <Node uri="footer">Footer Text</Node>
    </div>
    "#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    node_with_string_literal_uri,
    r#"<Node uri={"string.literal"}>Content</Node>"#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    node_with_template_literal_default,
    r#"<Node uri="test">{`template literal content`}</Node>"#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    node_with_markdown,
    r#"<Node uri="content.md">{md`markdown content`}</Node>"#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    preserves_existing_imports,
    r#"
    import React from "react";
    import { Node } from "djedi-react";
    
    <Node uri="test">Hello</Node>
    "#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    nested_nodes_in_component,
    r#"
    function MyComponent() {
        return (
            <div>
                <Node uri="title">Title</Node>
                <div>
                    <Node uri="nested">Nested Content</Node>
                </div>
            </div>
        );
    }
    "#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    node_with_additional_props,
    r#"<Node uri="test" className="custom" data-id="123">Content</Node>"#
);

test!(
    jsx_syntax(),
    |_| Transformer::default(),
    ignores_non_node_components,
    r#"
    <div>
        <TreeNode uri="test">Should not transform</TreeNode>
        <node uri="lowercase">Should not transform</node>
        <Node uri="actual">Should transform</Node>
    </div>
    "#
);
