import os

import simplejson as json
from django.core.files import File
from django.test import Client
from django.urls import reverse
from django.utils.encoding import smart_text
from django.utils.http import urlquote

import cio
import cio.conf
from cio.backends import storage
from cio.backends.exceptions import NodeDoesNotExist, PersistenceError
from cio.plugins import plugins
from cio.utils.uri import URI
from djedi.plugins.form import BaseEditorForm
from djedi.tests.base import ClientTest, DjediTest, UserMixin


def json_node(response, simple=True):
    node = json.loads(response.content)
    if simple and "meta" in node:
        del node["meta"]
    return node


class PermissionTest(DjediTest, UserMixin):
    def setUp(self):
        super().setUp()
        self.master = self.create_djedi_master()
        self.apprentice = self.create_djedi_apprentice()

    def test_permissions(self):
        client = Client()
        url = reverse("admin:djedi:api", args=["i18n://sv-se@page/title"])

        response = client.get(url)
        self.assertEqual(response.status_code, 403)

        logged_in = client.login(username=self.master.username, password="test")
        self.assertTrue(logged_in)
        response = client.get(url)
        self.assertEqual(response.status_code, 404)

        client.logout()
        logged_in = client.login(username=self.apprentice.username, password="test")
        self.assertTrue(logged_in)
        response = client.get(url)
        self.assertEqual(response.status_code, 404)


class PrivateRestTest(ClientTest):
    def get_api_url(self, url_name, uri):
        return reverse(
            "admin:djedi:" + url_name, args=[urlquote(urlquote(uri, ""), "")]
        )

    def get(self, url_name, uri):
        url = self.get_api_url(url_name, uri)
        return self.client.get(url)

    def post(self, url_name, uri, data):
        url = self.get_api_url(url_name, uri)
        return self.client.post(url, data)

    def put(self, url_name, uri, data=None):
        url = self.get_api_url(url_name, uri)
        return self.client.put(url, data=data or {})

    def delete(self, url_name, uri):
        url = self.get_api_url(url_name, uri)
        return self.client.delete(url)

    def test_get(self):
        response = self.get("api", "i18n://sv-se@page/title")
        self.assertEqual(response.status_code, 404)

        cio.set("i18n://sv-se@page/title.md", "# Djedi", publish=False)

        response = self.get("api", "i18n://sv-se@page/title")
        self.assertEqual(response.status_code, 404)

        response = self.get("api", "i18n://sv-se@page/title#draft")
        self.assertEqual(response.status_code, 200)
        node = json_node(response)
        self.assertKeys(node, "uri", "content")
        self.assertEqual(node["uri"], "i18n://sv-se@page/title.md#draft")
        self.assertRenderedMarkdown(node["content"], "# Djedi")

    def test_load(self):
        response = self.get("api.load", "i18n://sv-se@page/title")
        self.assertEqual(response.status_code, 200)
        json_content = json.loads(response.content)
        self.assertEqual(json_content["uri"], "i18n://sv-se@page/title.txt")
        self.assertIsNone(json_content["data"])
        self.assertEqual(len(json_content["meta"].keys()), 0)

        # TODO: Should get 404
        # response = self.get('api.load', 'i18n://sv-se@page/title#1')
        # self.assertEqual(response.status_code, 404)

        cio.set("i18n://sv-se@page/title.md", "# Djedi")

        response = self.get("api.load", "sv-se@page/title")
        self.assertEqual(response.status_code, 200)
        node = json_node(response, simple=False)
        meta = node.pop("meta", {})
        content = "# Djedi" if cio.PY26 else "<h1>Djedi</h1>"
        self.assertDictEqual(
            node,
            {
                "uri": "i18n://sv-se@page/title.md#1",
                "data": "# Djedi",
                "content": content,
            },
        )
        self.assertKeys(meta, "modified_at", "published_at", "is_published")

        response = self.get("api.load", "i18n://sv-se@page/title#1")
        json_content = json.loads(response.content)
        self.assertEqual(json_content["uri"], "i18n://sv-se@page/title.md#1")

        self.assertEqual(len(cio.revisions("i18n://sv-se@page/title")), 1)

    def test_set(self):
        response = self.post("api", "i18n://page/title", {"data": "# Djedi"})
        self.assertEqual(response.status_code, 400)

        response = self.post(
            "api",
            "i18n://sv-se@page/title.txt",
            {"data": "# Djedi", "data[extra]": "foobar"},
        )
        self.assertEqual(response.status_code, 400)

        uri = "i18n://sv-se@page/title.md"
        response = self.post(
            "api", uri, {"data": "# Djedi", "meta[message]": "lundberg"}
        )
        self.assertEqual(response.status_code, 200)
        node = json_node(response, simple=False)
        meta = node.pop("meta")
        content = "# Djedi" if cio.PY26 else "<h1>Djedi</h1>"
        self.assertDictEqual(
            node, {"uri": "i18n://sv-se@page/title.md#draft", "content": content}
        )
        self.assertEqual(meta["author"], "master")
        self.assertEqual(meta["message"], "lundberg")

        node = cio.get(uri, lazy=False)
        self.assertIsNone(node.content)
        cio.publish(uri)
        node = cio.get(uri, lazy=False)
        self.assertEqual(node.uri, "i18n://sv-se@page/title.md#1")
        self.assertRenderedMarkdown(node.content, "# Djedi")

        response = self.post(
            "api", node.uri, {"data": "# Djedi", "meta[message]": "Lundberg"}
        )
        node = json_node(response, simple=False)
        self.assertEqual(node["meta"]["message"], "Lundberg")

        with self.assertRaises(PersistenceError):
            storage.backend._create(URI(node["uri"]), None)

    def test_delete(self):
        response = self.delete("api", "i18n://sv-se@page/title")
        self.assertEqual(response.status_code, 404)

        node = cio.set("i18n://sv-se@page/title.md", "# Djedi")

        response = self.delete("api", node.uri)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(smart_text(response.content), "")

        with self.assertRaises(NodeDoesNotExist):
            storage.get("i18n://sv-se@page/title")

        node = cio.get("i18n://page/title", lazy=False)
        self.assertIsNone(node.content)

    def test_publish(self):
        node = cio.set("sv-se@page/title", "Djedi", publish=False)

        response = self.get("api", "i18n://sv-se@page/title")
        self.assertEqual(response.status_code, 404)

        response = self.put("api.publish", node.uri)
        self.assertEqual(response.status_code, 200)

        response = self.get("api", "i18n://sv-se@page/title")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            json_node(response),
            {"uri": "i18n://sv-se@page/title.txt#1", "content": "Djedi"},
        )
        response = self.put("api.publish", "i18n://sv-se@foo/bar.txt#draft")

        self.assertEqual(response.status_code, 404)

    def test_revisions(self):
        cio.set("sv-se@page/title", "Djedi 1")
        cio.set("sv-se@page/title", "Djedi 2")

        response = self.get("api.revisions", "sv-se@page/title")
        self.assertEqual(response.status_code, 200)

        content = json.loads(response.content)
        self.assertEqual(
            content,
            [
                ["i18n://sv-se@page/title.txt#1", False],
                ["i18n://sv-se@page/title.txt#2", True],
            ],
        )

    def test_render(self):
        response = self.post("api.render", "foo", {"data": "# Djedi"})
        assert response.status_code == 404

        response = self.post("api.render", "md", {"data": "# Djedi"})
        assert response.status_code == 200
        self.assertRenderedMarkdown(smart_text(response.content), "# Djedi")

        response = self.post(
            "api.render",
            "img",
            {
                "data": json.dumps(
                    {"url": "/foo/bar.png", "width": "64", "height": "64"}
                )
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            smart_text(response.content),
            '<img alt="" height="64" src="/foo/bar.png" width="64" />',
        )

    def test_editor(self):
        response = self.get("cms.editor", "sv-se@page/title.foo")
        self.assertEqual(response.status_code, 404)

        response = self.get("cms.editor", "sv-se@page/title")
        self.assertEqual(response.status_code, 404)

        for ext in plugins:
            response = self.get("cms.editor", "sv-se@page/title." + ext)
            self.assertEqual(response.status_code, 200)
            if ext == "img":
                assert set(response.context_data.keys()) == {
                    "THEME",
                    "VERSION",
                    "PLUGINS",
                    "uri",
                    "plugin",
                    "forms",
                }
                assert "HTML" in response.context_data["forms"]
                assert isinstance(
                    response.context_data["forms"]["HTML"], BaseEditorForm
                )

                self.assertListEqual(
                    ["data__id", "data__alt", "data__class"],
                    list(response.context_data["forms"]["HTML"].fields.keys()),
                )

            else:
                assert set(response.context_data.keys()) == {
                    "THEME",
                    "VERSION",
                    "PLUGINS",
                    "uri",
                    "plugin",
                }

            self.assertNotIn(b"document.domain", response.content)

        with cio.conf.settings(XSS_DOMAIN="foobar.se"):
            response = self.post("cms.editor", "sv-se@page/title", {"data": "Djedi"})
            self.assertEqual(response.status_code, 200)
            self.assertIn(b'document.domain = "foobar.se"', response.content)

    def test_image_dataform(self):
        from djedi.plugins.img import DataForm

        data_form = DataForm()
        html = data_form.as_table()

        self.assertTrue('name="data[alt]"' in html)
        self.assertTrue('name="data[class]"' in html)
        self.assertTrue('name="data[id]"' in html)

    def test_upload(self):
        tests_dir = os.path.dirname(os.path.abspath(__file__))
        image_path = os.path.join(tests_dir, "assets", "image.png")

        form = {
            "data[width]": "64",
            "data[height]": "64",
            "data[crop]": "64,64,128,128",
            "data[id]": "vw",
            "data[class]": "year-53",
            "data[alt]": "Zwitter",
            "meta[comment]": "VW",
        }

        response = self.post("api", "i18n://sv-se@header/logo.img", form)

        self.assertEqual(response.status_code, 200)

        with open(image_path, "rb") as image:
            file = File(image, name=image_path)
            form["data[file]"] = file
            response = self.post("api", "i18n://sv-se@header/logo.img", form)
            self.assertEqual(response.status_code, 200)

            node = json_node(response, simple=False)
            meta = node.pop("meta")
            uri, content = node["uri"], node["content"]
            self.assertEqual(uri, "i18n://sv-se@header/logo.img#draft")
            self.assertEqual(meta["comment"], "VW")
            html = (
                "<img "
                'alt="Zwitter" '
                'class="year-53" '
                'height="64" '
                'id="vw" '
                'src="/media/djedi/img/03/5e/5eba6fc2149822a8dbf76cd6978798f2ddc4ac34.png" '
                'width="64" />'
            )
            self.assertEqual(content, html)

            # Post new resized version
            node = cio.load(uri)
            del form["data[file]"]
            del form["data[crop]"]
            form["data[width]"] = form["data[height]"] = "32"
            form["data[filename]"] = node["data"]["filename"]

            response = self.post("api", "i18n://sv-se@header/logo.img", form)
            self.assertEqual(response.status_code, 200)

    def test_save_nested_content(self):
        data = {
            "direction": "col",
            "children": [
                {
                    "key": "abc123",
                    "plugin": "md",
                    "data": "# One banana",
                },
                {
                    "key": "321cba",
                    "plugin": "txt",
                    "data": "Bananas",
                },
            ],
        }
        listnode = cio.set("sv-se@page/apa.list", json.dumps(data))
        text_node_uri = listnode.uri.clone(query={"key": ["321cba"], "plugin": ["txt"]})
        self.assertEqual(
            listnode.content,
            (
                '<ul class="djedi-list djedi-list--col">'
                '<li class="djedi-plugin--md" id="abc123">'
                "<h1>One banana</h1>"
                "</li>"
                '<li class="djedi-plugin--txt" id="321cba">'
                "Bananas"
                "</li>"
                "</ul>"
            ),
        )
        text_node = cio.load(text_node_uri)
        self.assertEqual(text_node["data"], "Bananas")
        self.assertEqual(text_node["content"], "Bananas")

        md_node = cio.load(
            listnode.uri.clone(query={"key": ["abc123"], "plugin": ["md"]})
        )
        self.assertEqual(md_node["content"], "<h1>One banana</h1>")
        self.assertEqual(md_node["data"], "# One banana")

        form = {
            "data[width]": "64",
            "data[height]": "64",
            "data[crop]": "64,64,128,128",
            "data[id]": "vw",
            "data[class]": "year-53",
            "data[alt]": "Zwitter",
            "meta[comment]": "VW",
        }
        response = self.post(
            "api", "i18n://sv-se@page/apa.list?key=imagekey&plugin=img", form
        )
        self.assertEqual(response.status_code, 200)

        # TODO: Test getting default data
        # img_node_in_list = cio.load('sv-se@page/apa.list?key=idontexist&plugin=img')
        # img_node = cio.load('sv-se@page/monkeydo.img')
        # self.assertEqual(img_node_in_list['data'], img_node['data'])
        # self.assertEqual(img_node_in_list['content'], img_node['content'])

        # Test setting new subnode data
        cio.set("sv-se@page/apa.list?key=newkey&plugin=md", "# Banan")
        node_data = cio.load("sv-se@page/apa.list?key=newkey&plugin=md")
        self.assertEqual(node_data["content"], "<h1>Banan</h1>")
        self.assertEqual(node_data["data"], "# Banan")

        # Test setting existing subnode data
        cio.set("sv-se@page/apa.list?key=abc123&plugin=md", "# Two Bananas")
        node_data = cio.load("sv-se@page/apa.list?key=abc123&plugin=md")

        self.assertEqual(node_data["content"], "<h1>Two Bananas</h1>")
        self.assertEqual(node_data["data"], "# Two Bananas")

        # Test setting it multiple times
        cio.set(
            "sv-se@page/apa.list#draft",
            json.dumps(
                {
                    "direction": "col",
                    "children": [
                        {
                            "key": "abc123",
                            "plugin": "md",
                            "data": "# One banana",
                        }
                    ],
                }
            ),
        )
        cio.set("sv-se@page/apa.list?key=abc123&plugin=md", "# No bananas")
        cio.set("sv-se@page/apa.list?key=abc123&plugin=md", "# Many bananas")
        cio.set("sv-se@page/apa.list?key=abc123&plugin=md", "# Many bananas")
        node_data = cio.load("sv-se@page/apa.list?key=abc123&plugin=md")
        parent_node = cio.load("sv-se@page/apa.list")
        self.assertEqual(node_data["content"], "<h1>Many bananas</h1>")
        self.assertEqual(node_data["data"], "# Many bananas")
        self.assertDictEqual(
            parent_node["data"],
            {
                "direction": "col",
                "children": [
                    {
                        "key": "abc123",
                        "plugin": "md",
                        "data": "# Many bananas",
                    }
                ],
            },
        )

        # Test nested list
        cio.set(
            "sv-se@page/apa.list",
            json.dumps(
                {
                    "direction": "col",
                    "children": [
                        {
                            "key": "abc123",
                            "plugin": "md",
                            "data": "# One banana",
                        }
                    ],
                }
            ),
        )
        cio.set(
            "sv-se@page/apa.list?key=321cba&plugin=list",
            json.dumps(
                {
                    "direction": "col",
                    "children": [
                        {
                            "key": "betterkey",
                            "plugin": "md",
                            "data": "# My banana",
                        }
                    ],
                }
            ),
        )
        node_data = cio.load("sv-se@page/apa.list?key=abc123&plugin=md")
        list_node = cio.load("sv-se@page/apa.list?key=321cba&plugin=list")
        parent_node = cio.load("sv-se@page/apa.list")
        child_node = cio.load("sv-se@page/apa.list?key=321cba_betterkey&plugin=md")
        self.assertEqual(node_data["content"], "<h1>One banana</h1>")
        self.assertEqual(node_data["data"], "# One banana")
        self.assertDictEqual(
            parent_node["data"],
            {
                "direction": "col",
                "children": [
                    {
                        "key": "abc123",
                        "plugin": "md",
                        "data": "# One banana",
                    },
                    {
                        "key": "321cba",
                        "plugin": "list",
                        "data": json.dumps(
                            {
                                "direction": "col",
                                "children": [
                                    {
                                        "key": "betterkey",
                                        "plugin": "md",
                                        "data": "# My banana",
                                    }
                                ],
                            }
                        ),
                    },
                ],
            },
        )
        self.assertDictEqual(
            list_node["data"],
            {
                "direction": "col",
                "children": [
                    {
                        "key": "betterkey",
                        "plugin": "md",
                        "data": "# My banana",
                    }
                ],
            },
        )
        self.assertEqual(child_node["data"], "# My banana")
        self.assertEqual(child_node["content"], "<h1>My banana</h1>")

        cio.set("sv-se@page/apa.list?key=321cba_betterkey&plugin=md", "# Not yours")
        deep_node = cio.load("sv-se@page/apa.list?key=321cba_betterkey&plugin=md")
        list_node = cio.load("sv-se@page/apa.list?key=321cba&plugin=list")
        self.assertEqual(deep_node["data"], "# Not yours")
        self.assertEqual(deep_node["content"], "<h1>Not yours</h1>")
        self.assertEqual(
            list_node["data"],
            {
                "direction": "col",
                "children": [
                    {
                        "key": "betterkey",
                        "plugin": "md",
                        "data": "# Not yours",
                    }
                ],
            },
        )

        empty_subnode = cio.set(
            "sv-se@page/apa.list?key=321cba_betterkey&plugin=md", ""
        )
        list_node = cio.load("sv-se@page/apa.list?key=321cba&plugin=list")
        self.assertIsNone(empty_subnode.content)
        self.assertEqual(
            list_node["data"],
            {
                "direction": "col",
                "children": [
                    {
                        "key": "betterkey",
                        "plugin": "md",
                        "data": "",
                    }
                ],
            },
        )

        cio.set(
            "sv-se@page/render.list", json.dumps({"direction": "col", "children": []})
        )
        response = self.post("api.render", "md", {"data": "# Djedi"})
        assert response.status_code == 200
        self.assertRenderedMarkdown(smart_text(response.content), "# Djedi")

        data = {
            "direction": "col",
            "children": [
                {
                    "key": "betterkey",
                    "plugin": "md",
                    "data": "# Not yours",
                }
            ],
        }

        response = self.post("api.render", "list", {"data": json.dumps(data)})
        assert response.status_code == 200
        self.assertEqual(
            response.content,
            b'<ul class="djedi-list djedi-list--col">'
            b'<li class="djedi-plugin--md" id="betterkey">'
            b"<h1>Not yours</h1>"
            b"</li>"
            b"</ul>",
        )

        empty_subnode = cio.set(
            "sv-se@page/listthatdoesntexist.list?key=321cba&plugin=md", "# Hej"
        )
        self.assertEqual(empty_subnode.content, "<h1>Hej</h1>")

        response = self.get("cms.editor", "sv-se@page/context-test.list?plugin=img")
        self.assertEqual(response.status_code, 200)
        assert set(response.context_data.keys()) == {
            "THEME",
            "VERSION",
            "PLUGINS",
            "uri",
            "plugin",
            "forms",
        }
        assert "HTML" in response.context_data["forms"]
        assert isinstance(response.context_data["forms"]["HTML"], BaseEditorForm)

        self.assertListEqual(
            ["data__id", "data__alt", "data__class"],
            list(response.context_data["forms"]["HTML"].fields.keys()),
        )


class PublicRestTest(ClientTest):
    def test_api_root_not_found(self):
        url = reverse("admin:djedi:rest:api-base")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_embed(self):
        url = reverse("admin:djedi:rest:embed")
        response = self.client.get(url)
        html = smart_text(response.content)

        self.assertIn('iframe id="djedi-cms"', html)
        cms_url = "http://testserver" + reverse("admin:djedi:cms")
        self.assertIn(cms_url, html)
        self.assertNotIn("window.DJEDI_NODES", html)
        self.assertNotIn("document.domain", html)

        with cio.conf.settings(XSS_DOMAIN="foobar.se"):
            response = self.client.get(url)
            self.assertIn(b'document.domain = "foobar.se"', response.content)

        self.client.logout()
        response = self.client.get(url)
        self.assertEqual(response.status_code, 204)

    def test_nodes(self):
        with self.assertCache(sets=1):
            cio.set("sv-se@rest/label/email", "E-post")

        with self.assertDB(calls=1), self.assertCache(
            calls=1, misses=1, hits=1, sets=0
        ):
            url = reverse("admin:djedi:rest:nodes")
            response = self.client.post(
                url,
                json.dumps(
                    {
                        "rest/page/body.md": "# Foo Bar",
                        "rest/label/email": "E-mail",
                    }
                ),
                content_type="application/json",
            )

        json_content = json.loads(response.content)

        self.assertIn("i18n://sv-se@rest/page/body.md", json_content.keys())
        self.assertEqual(
            json_content["i18n://sv-se@rest/page/body.md"], "<h1>Foo Bar</h1>"
        )
        self.assertIn("i18n://sv-se@rest/label/email.txt#1", json_content.keys())
        self.assertEqual(json_content["i18n://sv-se@rest/label/email.txt#1"], "E-post")
