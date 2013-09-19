test:
	python setup.py test

flake8:
	flake8 --ignore=E501,W402,W801 --max-complexity 12 djedi

install:
	python setup.py install

develop:
	python setup.py develop

coverage:
	coverage run --include=djedi/* setup.py test

clean:
	rm -rf .tox/ dist/ *.egg *.egg-info .coverage tests/media/
