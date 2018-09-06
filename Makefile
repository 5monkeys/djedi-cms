.DEFAULT_GOAL := help

.PHONY: help  # shows available commands
help:
	@echo "\nAvailable commands:\n\n $(shell sed -n 's/^.PHONY:\(.*\)/ *\1\\n/p' Makefile)"

.PHONY: test
test:
	coverage run setup.py test

.PHONY: test_all  # runs tests using detox, combines coverage and reports it
test_all:
	detox
	make coverage

.PHONY: coverage  # combines coverage and reports it
coverage:
	coverage combine || true
	coverage report

.PHONY: lint
lint:
	flake8 djedi

.PHONY: install
install:
	python setup.py install

.PHONY: develop
develop:
	python setup.py develop

.PHONY: build_example
build_example:
	docker-compose up --build -d
	rm example/db.sqlite3* || true
	docker-compose run --rm django migrate
	docker-compose run --rm django createsuperuser \
		--username admin \
		--email admin@example.com

.PHONY: example
example:
	docker-compose start || make build_example
	@echo "\n✨  Djedi-CMS example is running now ✨\n"
	docker-compose logs -f --tail=5 django

.PHONY: clean
clean:
	rm -rf .tox/ dist/ *.egg *.egg-info .coverage* .eggs

.PHONY: compile
compile:
	coffee -cw .
