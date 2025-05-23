deployold:
	cp *.ico ../../combo-analyser/
	cp *.js ../../combo-analyser/
	cp *.html ../../combo-analyser/
	cp *.css ../../combo-analyser/
	cp local_config/* ../../combo-analyser/local_config/

	cd ../../combo-analyser && git add . && git commit -m "deploy" && git push

clean:
	cd ../../combo-analyser && rm -rf node_modules
	cd ../../combo-analyser && rm -rf public
	cd ../../combo-analyser && rm -rf src

update:
	cp -r * ../../combo-analyser/

build_modules:
	cd ../../combo-analyser && rm -rf node_modules && npm install

force_reload_app:
	cd ../../combo-analyser && sed -i '' 's/const reset_local_storage_to_local_config = false;/const reset_local_storage_to_local_config = true;/' src/App.js
	cd ../../combo-analyser && sed -i '' 's/const reset_last_selected_combo_to_long_call = false;/const reset_last_selected_combo_to_long_call = true;/' src/App.js

commit:
	cd ../../combo-analyser && git add . && git commit -m "deploy" && git push -u origin main

deploy:
	cd ../../combo-analyser && rm -rf node_modules
	cd ../../combo-analyser && rm -rf public
	cd ../../combo-analyser && rm -rf src
	cp -r * ../../combo-analyser/
	cd ../../combo-analyser && rm -rf node_modules && npm install
	cd ../../combo-analyser && sed -i '' 's/const reset_local_storage_to_local_config = false;/const reset_local_storage_to_local_config = true;/' src/App.js
	cd ../../combo-analyser && sed -i '' 's/const reset_last_selected_combo_to_long_call = false;/const reset_last_selected_combo_to_long_call = true;/' src/App.js
	cd ../../combo-analyser && git add . && git commit -m "deploy" && git push -u origin main
	cd ../../combo-analyser && npm run deploy

deploy1: clean update build_modules force_reload_app commit
	echo "Deploying to combo-analyser"
	cd ../../combo-analyser && npm run deploy

update_local_cfg:
	cp ../backend-python/config.json local_config/	
	cp ../backend-python/prices.json local_config/	
	cp ../backend-python/combo_templates.json local_config/
