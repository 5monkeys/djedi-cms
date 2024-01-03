#![warn(clippy::pedantic)]

use swc_core::common::{Spanned, DUMMY_SP};
use swc_core::ecma::ast::{
    CallExpr, Callee, Expr, ExprOrSpread, ExprStmt, Ident, ImportDecl, ImportNamedSpecifier,
    ImportSpecifier, JSXText, KeyValueProp, Lit, MemberExpr, ModuleDecl, ModuleItem, Null,
    ObjectLit, Prop, PropOrSpread, Str, TaggedTpl, Tpl,
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
        JSXElementName::Ident(ref ident) => ident.as_ref() == COMPONENT_NAME,
        JSXElementName::JSXMemberExpr(_) | JSXElementName::JSXNamespacedName(_) => false,
    }
}

/// Get the value of the `uri` attribute.
fn uri_attr(e: &JSXElement) -> Option<Box<Expr>> {
    let value = e.opening.attrs.iter().find_map(|attr| match attr {
        JSXAttrOrSpread::JSXAttr(attr) => match attr.name {
            JSXAttrName::Ident(ref ident) => {
                if ident.as_ref() == "uri" {
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

    let expr = value.as_str_expr();

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

trait AsStrExpr {
    fn as_str_expr(&self) -> Option<Box<Expr>>;
}

impl AsStrExpr for Lit {
    fn as_str_expr(&self) -> Option<Box<Expr>> {
        match self {
            Lit::Str(Str { value, .. }) | Lit::JSXText(JSXText { value, .. }) => {
                Some(Box::new(Expr::Lit(value.clone().into())))
            }
            _ => None,
        }
    }
}

impl AsStrExpr for JSXExprContainer {
    fn as_str_expr(&self) -> Option<Box<Expr>> {
        fn tpl_to_expr(tpl: &Tpl) -> Option<Box<Expr>> {
            // only allow template literals without substitutions
            if tpl.exprs.is_empty() && tpl.quasis.len() == 1 {
                Some(Box::new(Expr::Lit(tpl.quasis[0].raw.clone().into())))
            } else {
                None
            }
        }

        match &self.expr {
            JSXExpr::Expr(e) => match e.as_ref() {
                Expr::Lit(lit) => lit.as_str_expr(),
                Expr::Tpl(tpl) => tpl_to_expr(tpl),
                Expr::TaggedTpl(TaggedTpl { tag, tpl, .. }) => match tag.as_ref() {
                    Expr::Ident(ident) if ident.sym.as_str() == MARKDOWN_TAG => tpl_to_expr(tpl),
                    _ => None,
                },
                _ => None,
            },
            JSXExpr::JSXEmptyExpr(_) => None,
        }
    }
}

impl AsStrExpr for JSXAttrValue {
    fn as_str_expr(&self) -> Option<Box<Expr>> {
        match self {
            JSXAttrValue::JSXExprContainer(exp) => exp.as_str_expr(),
            JSXAttrValue::Lit(lit) => lit.as_str_expr(),
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
            Some(Box::new(Expr::Lit(Lit::Str(t.value.clone().into()))))
        }
        (Some(JSXElementChild::JSXExprContainer(container)), None) => container.as_str_expr(),
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
                        prop: quote_ident!("reportPrefetchableNode").into(),
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
                type_args: None,
            }
            .into(),
        }
        .into(),
    )
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
    swc_ecma_parser::Syntax::Es(swc_ecma_parser::EsConfig {
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
