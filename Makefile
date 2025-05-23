clean:
	cd ../../combo-analyser && rm -rf node_modules
	cd ../../combo-analyser && rm -rf public
	cd ../../combo-analyser && rm -rf src

update:
	cp -r * ../../combo-analyser/

build_modules:
	cp package-deploy.json ../../combo-analyser/package.json
	cd ../../combo-analyser && rm -rf node_modules && npm install

force_reload_app:
	cd ../../combo-analyser && sed -i '' 's/const reset_local_storage_to_local_config = false;/const reset_local_storage_to_local_config = true;/' src/App.js
	cd ../../combo-analyser && sed -i '' 's/const reset_last_selected_combo_to_long_call = false;/const reset_last_selected_combo_to_long_call = true;/' src/App.js

commit:
	cd ../../combo-analyser && git add . && git commit -m "deploy" && git push -u origin main


deploy: clean update build_modules force_reload_app commit
	echo "Deploying to combo-analyser"
	cd ../../combo-analyser && npm run deploy

