# General Notes

## Installation instructions

Clone the repository

> git clone git://github.com/ednapiranha/generalnotes.git

Install redis

> brew install redis

Make sure redis is active.

Install node by using brew or through the website http://nodejs.org/#download

> cd generalnotes

> cp local.json-dist local.json

> npm install

Run the site

> node app.js

## Running a version in production

If you want to run a version of this in production, use grunt to minify CSS and JS files.

Run grunt through node_modules/grunt-cli/bin/grunt or install globally:

> npm install -g grunt-cli

Every time you make changes, update public/manifest.appcache and run the following:

> grunt

## Tests

> make test
