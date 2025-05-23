# Deploy

- go to combo-analyser directory
- removed all application's files
- copied all files from my-options/frontend in .
- rebuild packackages

```
rm -rf node_modules package-lock.json
npm install
```

- check that application is running

```
npm run start
```
- install gh-pages package:
```
npm install gh-pages --save-dev
```

In `package.json` file, 
- add at the beginning of the file:

```json
"homepage": "https://pierrebressy.github.io/combo-analyser",
```
- in the scripts section, add:

```json
  "predeploy": "npm run build",
  "deploy": "gh-pages -d build",
```