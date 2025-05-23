deployold:
	cp *.ico ../../combo-analyser/
	cp *.js ../../combo-analyser/
	cp *.html ../../combo-analyser/
	cp *.css ../../combo-analyser/
	cp local_config/* ../../combo-analyser/local_config/

	cd ../../combo-analyser && git add . && git commit -m "deploy" && git push

clean:
	rm -rf ../../combo-analyser/*

deploy:
	cp -r * ../../combo-analyser/
	cd ../../combo-analyser && git add . && git commit -m "deploy" && git push

update_local_cfg:
	cp ../backend-python/config.json local_config/	
	cp ../backend-python/prices.json local_config/	
	cp ../backend-python/combo_templates.json local_config/
