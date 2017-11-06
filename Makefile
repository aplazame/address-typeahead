
git_branch := $(shell git rev-parse --abbrev-ref HEAD)

demo:
	python -m SimpleHTTPServer & open http://localhost:8000

lint:
	@echo "❏ eslint"
	@$(shell npm bin)/eslint src

test: lint
	@echo "❏ mocha tests"
	# @$(shell npm bin)/mocha src/*-test.js --compilers js:babel-core/register
	@$(shell npm bin)/mocha src/*-test.js --require babel-register

build: test
	$(shell npm bin)/rollup -o dist/address-typeahead.umd.js --output.format=umd -n=AddressTypeahead src/address-typeahead.js
	$(shell npm bin)/rollup -o dist/address-typeahead.js --output.format=cjs src/address-typeahead.js
	$(shell npm bin)/babel src/address-typeahead.js --out-file dist/address-typeahead.babel.js --presets=env

	$(shell npm bin)/uglifyjs dist/address-typeahead.js -o dist/address-typeahead.min.js --compress --mangle
	$(shell npm bin)/uglifyjs dist/address-typeahead.umd.js -o dist/address-typeahead.umd.min.js --compress --mangle

npm.increaseVersion:
	npm version patch --no-git-tag-version

npm.pushVersion: npm.increaseVersion
	git commit -a -n -m "v$(shell node -e "process.stdout.write(require('./package').version + '\n')")" 2> /dev/null; true
	git push origin $(master_branch)

git.tag: build
	git pull --tags
	git add dist -f --all
	-git commit -n -m "updating dist" 2> /dev/null; true
	git tag -a v$(shell node -e "process.stdout.write(require('./package').version + '\n')") -m "v$(shell node -e "process.stdout.write(require('./package').version + '\n')")"
	git push --tags
	# git push origin $(git_branch)

npm.publish: npm.pushVersion git.tag
	npm publish
	git reset --hard origin/$(git_branch)
	@git checkout $(git_branch)

github.release: export PKG_NAME=$(shell node -e "console.log(require('./package.json').name);")
github.release: export PKG_VERSION=$(shell node -e "console.log('v'+require('./package.json').version);")
github.release: export RELEASE_URL=$(shell curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${GITHUB_TOKEN}" \
	-d '{"tag_name": "${PKG_VERSION}", "target_commitish": "$(git_branch)", "name": "${PKG_VERSION}", "body": "", "draft": false, "prerelease": false}' \
	-w '%{url_effective}' "https://api.github.com/repos/aplazame/address-typeahead/releases" )
github.release:
	@echo ${RELEASE_URL}
	@true

release: npm.publish github.release

.DEFAULT_GOAL := build
