.PHONY: test
test:
	python setup.py test

.PHONY: lint
lint:
	flake8 djedi

.PHONY: install
install:
	python setup.py install

.PHONY: develop
develop:
	python setup.py develop

.PHONY: coverage
coverage:
	coverage run setup.py test
	coverage report

.PHONY: clean
clean:
	rm -rf .tox/ dist/ *.egg *.egg-info .coverage

.PHONY: compile
compile:
	coffee -cw .
