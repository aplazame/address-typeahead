
GIT_BRANCH=$(shell git rev-parse --abbrev-ref HEAD)

demo:
	python -m SimpleHTTPServer & open http://localhost:8000

npm.publish:
	git pull --tags
	npm version patch
	git push origin $(GIT_BRANCH)
	git push --tags
	npm publish

github.release: export PKG_VERSION=$(shell node -e "console.log('v'+require('./package.json').version);")
github.release: export RELEASE_URL=$(shell curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${GITHUB_TOKEN}" \
	-d '{"tag_name": "${PKG_VERSION}", "target_commitish": "$(GIT_BRANCH)", "name": "${PKG_VERSION}", "body": "", "draft": false, "prerelease": false}' \
	-w '%{url_effective}' "https://api.github.com/repos/aplazame/address-typeahead/releases" )
github.release:
	@echo ${RELEASE_URL}
	@true

release: npm.publish github.release
