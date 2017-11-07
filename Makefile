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
	@echo "\n✨  Djedi-CMS example is running at http://localhost:8000 ✨\n"

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
