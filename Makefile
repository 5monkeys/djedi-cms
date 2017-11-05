test:
	django-admin.py test --settings=djedi.tests.settings djedi --verbosity=2

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
