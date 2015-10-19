test:
	python setup.py test

flake8:
	flake8 djedi

install:
	python setup.py install

develop:
	python setup.py develop

coverage:
	coverage run --source djedi setup.py test

clean:
	rm -rf .tox/ dist/ *.egg *.egg-info .coverage

js:
	coffee -c djedi/static/djedi/cms/js/uri.coffee && \
	coffee -c djedi/static/djedi/cms/js/client.coffee && \
	coffee -c djedi/static/djedi/cms/js/cms.coffee && \
	coffee -c djedi/static/djedi/plugins/base/js/editor.coffee && \
	coffee -c djedi/static/djedi/plugins/img/js/img.coffee

css:
	lessc -ru djedi/static/djedi/themes/darth/theme.less djedi/static/djedi/themes/darth/theme.css && \
	lessc -ru djedi/static/djedi/themes/luke/theme.less djedi/static/djedi/themes/luke/theme.css

