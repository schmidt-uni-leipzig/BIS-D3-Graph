![Build status](https://travis-ci.org/k4l4m/BIS-D3-Graph.svg?branch=master)

# BIS-D3-Graph
Graph visualization with D3 - Betriebliche Informationssysteme - University of Leipzig

## Install
Install [node](https://nodejs.org/en/), [bower](http://bower.io) and [grunt](http://gruntjs.com/getting-started).
Run `npm install && bower install` to install dependencies and develop tools. 

## Build
Run `grunt build` to build and minify a library for production usage.

## Run examples
- Clone project (or download zip file)
- Go to directory and download bower dependencies. `bower install`
- Open examples in example directory

## Dependencies
- [angular 1](https://github.com/angular/angular.js)
- [d3](https://github.com/d3/d3)
- [FileSaver](https://github.com/eligrey/FileSaver.js/)
- [jsPDF](https://github.com/MrRio/jsPDF)
- [canvas-to-blob](https://github.com/blueimp/JavaScript-Canvas-to-Blob) (polyfill for `canvas.toBlob()`, needed for Safari)

## Online examples
- [Standard](http://k4l4m.github.io/BIS-D3-Graph/examples/index.html)
- [Big graph](http://k4l4m.github.io/BIS-D3-Graph/examples/big-graph.html)
- [Node click longtext](http://k4l4m.github.io/BIS-D3-Graph/examples/node-click-longtext.html)

## Tasks
- Analyse current implementation
- Create AngularJS directive which covers functionalities
- Create documentation with example code

## Features
- Define data format for nodes / edges
 - Nodes: Label, icon, color, description
 - Edges: Label, color
- Improve path display
- Detail view
- Zoom (Problems with rectangle zoom, see [branch](https://github.com/k4l4m/BIS-D3-Graph/tree/rectangle-zoom))
- Grouping of nodes
- Label positioning (Problems with label placement, see [branch](https://github.com/k4l4m/BIS-D3-Graph/tree/labelPlacement))
- Forces
- Export to png and other formats

This project is part of the [BIS Module](http://bis.informatik.uni-leipzig.de/de/Lehre/16/SS/BIS?v=4uk). Supervisor of the project is [Johannes Schmidt](http://bis.informatik.uni-leipzig.de/JohannesSchmidt).
