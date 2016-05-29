/*jslint latedef:false*/
'use strict';

angular.module('d3graph', [])
    .directive('d3Graph', function ($log) {
        return {
            restrict: 'E',
            template: '<svg id="d3Graph"></svg>',
            scope: {
                data: '<',
                options: '<',
                api: '<?'
            },
            link: function (scope, element, attrs) {
                var width = 1000,
                    height = 700,
                    circleRadius = 10,
                    markerWidth = 5,
                    markerHeight = 8;

                var xScale = d3.scale.linear()
                    .domain([0, width]).range([0, width]);
                var yScale = d3.scale.linear()
                    .domain([0, height]).range([0, height]);

                var nodes = scope.data.nodes;
                var links = scope.data.edges;

                // Create object with every neighbour
                var adjacencyMatrix = {};
                var _nodeNeighbours = [];

                // Every node is a neighbour of himself
                nodes.forEach(function(node) {
                    adjacencyMatrix[[node.id, node.id]] = true;
                });

                // Create neighbours by links
                links.forEach(function(edge) {
                    adjacencyMatrix[[edge.source, + edge.target]] = true;
                });


                // Array of selected nodes
                var selectedNodes = [];

                var isRectZoom = false;

                /*
                 Utility Section
                 Define force layout, drag, zoom
                 */

                // Force layout
                var force = d3.layout.force()
                    .size([width, height])
                    .nodes(nodes)
                    .links(links);

                force
                    .linkDistance(170)
                    .charge(-1000);

                // Drag function
                var drag = d3.behavior.drag()
                    .origin(function (d) {
                        return d;
                    })
                    .on('dragstart', dragStarted)
                    .on("drag", dragged)
                    .on("dragend", dragEnded);

                // Zoom function
                // Use closure to save old scale and old translation
                // Needed to implement right click select
                var zoom = (function() {
                    var old = {};

                    return d3.behavior.zoom()
                        .scaleExtent([0.1, 10])
                        .x(xScale)
                        .y(yScale)
                        .on('zoomstart', function() { zoomStarted(old); })
                        .on('zoom', zoomed)
                        .on('zoomend', function() { zoomEnded(old); });
                })();

                /*
                 Init Section
                 Create svg, add event listeners, create graph
                 */

                // Add event control
                d3.select('body')
                    .on('keydown.brush', keyDown)
                    .on('keyup.brush', keyUp);

                // Style svg
                var svg = renderSVG(width, height, zoom);
                var container = renderGraphContainer(svg);
                var linksContainer = renderLinks(container);
                var nodesContainer = renderNodes(container);

                // Force step
                force.on('tick', function () {
                    nodesContainer
                        .attr('transform', function (d) {
                            return 'translate(' + d.x + ',' + d.y + ')';
                        });

                    // Move links
                    linksContainer
                        .selectAll('.link')
                        .attr('d', function (d) {
                            var dr = 0;
                            return 'M' + d.source.x + ',' + d.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
                        });

                    // Move path of the link text
                    linksContainer
                        .selectAll('.link .path')
                        .attr('d', function (d) {
                            return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
                        });

                    // Move link text
                    linksContainer
                        .selectAll('.link .label')
                        .attr('transform', function (d) {
                            if (d.target.x < d.source.x) {
                                var bbox = this.getBBox();
                                var rx = bbox.x + bbox.width / 2;
                                var ry = bbox.y + bbox.height / 2;
                                return 'rotate(180 ' + rx + ' ' + ry + ')';
                            }
                            else {
                                return 'rotate(0)';
                            }
                        });
                });

                /*
                 * Start block
                 */
                // Init markers for link ends
                initMarkers(svg, circleRadius, markerWidth, markerHeight);
                // Start the force layout
                force.start();

                var api = {
                    exportAsPNG: function(filename) {
                        exportAsPNG(filename, svg);
                    },
                    exportAsSVG: function(filename) {
                        exportAsSVG(filename, svg);
                    },
                    exportAsPDF: function(filename) {
                        exportAsPDF(filename, svg);
                    }
                };

                if (angular.isFunction(scope.api)) scope.api(api);

                /*
                 * Render functions
                 */
                // Render svg
                function renderSVG(width, height, zoom) {
                    return d3.select('#d3Graph')
                        .attr('width', width)
                        .attr('height', height)
                        .style('border', '1px dashed black')
                        .call(zoom)
                        .on('mousedown', rectZoom)
                        .on('contextmenu', exportArea);
                }

                // Render container for graph
                function renderGraphContainer(svg) {
                    return svg.append('g');
                }

                // Render the nodes
                function renderNodes(container) {
                    // Nodes container
                    var nodesContainer = container
                        .append('g')
                        .attr('id', 'nodes')
                        .selectAll('.node')
                        .data(nodes)
                        .enter()
                        .append('g')
                        .attr('class', 'node')
                        .call(drag) // Append node dragging
                        .on('mouseenter', nodeMouseEnter) // Mouse enter show label and neighbours
                        .on('mouseleave', nodeMouseLeave) // Reset label and neighbours
                        .on('click', nodeClick);

                    // Node background
                    nodesContainer.append('circle')
                        .attr('class', 'node background')
                        .attr('r', circleRadius)
                        .style('fill', function (d) {
                            return d.color || '#fff'; // default background color white
                        });

                    // Node icon
                    nodesContainer.append('text')
                        .attr('class', 'node icon')
                        .style({
                            'text-anchor': 'middle',
                            'dominant-baseline': 'central',
                            'font-family': 'FontAwesome',
                            'font-size': '13px'
                        })
                        .text(function (d) {
                            return d.type;
                        })

                    // Actual node
                    nodesContainer.append('circle')
                        .attr('class', 'node foreground')
                        .attr('r', circleRadius)
                        .style({
                            'fill': 'transparent',
                            'stroke': '#444',
                            'stroke-width': '1px',
                            'cursor': 'default'
                        });

                    // Node text, shown on mouseover
                    nodesContainer.append('text')
                        .attr('dx', 25)
                        .attr('dy', '.45em')
                        .attr('class', 'node text')
                        .text(function (d) {
                            return d.name;
                        }).call(wrap,50);
                        //.style('visibility', 'hidden');

                    return nodesContainer;
                }

                // Render the links
                function renderLinks(container) {
                    // Links container
                    var linksContainer = container
                        .append('g')
                        .attr('id', 'links')
                        .selectAll('.link')
                        .data(links)
                        .enter()
                        .append('g')
                        .attr('class', 'link');

                    // The link
                    linksContainer
                        .append('path')
                        .attr('class', 'link')
                        .attr('marker-end', 'url(#end)')
                        .style('stroke', function (d) {
                            return d.color || '#777';
                        })
                        .style({
                            'stroke-width': '2px',
                            'stroke-dasharray': '2 2'
                        });

                    // Append path for link text
                    linksContainer
                        .append('path')
                        .attr({
                            'class': 'link path',
                            'fill-opacity': 0,
                            'stroke-opacity': 0,
                            'fill': 'blue',
                            'stroke': 'red',
                            'id': function (d, i) {
                                return 'linkpath' + i;
                            }
                        })
                        .style('pointer-events', 'none');

                    // Append link text
                    linksContainer
                        .append('text')
                        .style('pointer-events', 'none')
                        .attr({
                            'class': 'link label',
                            'id': function (d, i) {
                                return 'linklabel' + i;
                            },
                            'dx': 80,
                            'dy': 0,
                            'font-size': 10,
                            'fill': '#aaa'
                        })
                        .append('textPath')
                        .attr('xlink:href', function (d, i) {
                            return '#linkpath' + i;
                        })
                        .style("pointer-events", "none")
                        .text(function (d) {
                            return d.text;
                        });

                    return linksContainer;
                }

                /*
                 * Event listeners
                 * key strokes, zoom, dragging
                 */
                // KeyDown
                function keyDown() {
                    if (d3.event.keyCode === 67) { // c key
                        centerGraph();
                        return;
                    }

                    if (d3.event.keyCode === 82) { // r key
                        //exportGraph();
                        isRectZoom = !isRectZoom; // toggle rectZoom
                        if (isRectZoom) {
                            zoom.on('zoom', null);
                        } else {
                            zoom.on('zoom', zoomed); //TODO bug with panning during disable
                        }
                        svg.call(zoom);
                        return;
                    }
                }

                // KeyUp
                // Mostly reseting states
                function keyUp() {

                }

                // Zoom
                function zoomStarted(old) {
                    if (d3.event.sourceEvent.button !== 0) { // no left click
                        old.translation = zoom.translate();
                        old.scale = zoom.scale();
                    }
                }

                function zoomed() {
                    if (d3.event.sourceEvent.button !== 0) return; // no left click
                    container.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
                }

                function zoomEnded(old) {
                    if (d3.event.sourceEvent.button !== 0) {
                        zoom.translate(old.translation);
                        zoom.scale(old.scale);
                    }
                }

                // Drag started
                function dragStarted() {
                    /*jshint validthis: true */
                    if (d3.event.sourceEvent.button !== 0) return; // no left click
                    d3.event.sourceEvent.stopPropagation();

                    d3.select(this).classed('dragging', true);
                    force.start();
                }

                // Dragging
                function dragged(d) {
                    /*jshint validthis: true */
                    if (d3.event.sourceEvent.button !== 0) return; // no left click
                    d3.select(this).attr('cx', d.x = d3.event.x).attr('cy', d.y = d3.event.y);
                }

                // Drag ended
                function dragEnded() {
                    /*jshint validthis: true */
                    if (d3.event.sourceEvent.button !== 0) return; // no left click
                    d3.select(this).classed('dragging', false);
                }

                // Listener for placing mouse cursor on node
                // Shows node text
                function nodeMouseEnter(selectedNode) {
                    /*jshint validthis: true */
                    d3.select(this).select('.node .text')
                        .style('visibility', 'visible');

                    // Hide all nodes that are not neighbours of the selected node
                    nodesContainer.style('opacity', function(node) {
                        // Is there a connection between nodes?
                        return adjacencyMatrix[[selectedNode.id, node.id]] || adjacencyMatrix[[node.id, selectedNode.id]] ? 1 : 0;
                    });

                    // Hide all links that don't connect to the selected node
                    linksContainer.style('opacity', function(link) {
                        // Selected node target or source?
                        return selectedNode.id === link.source.id || selectedNode.id === link.target.id ? 1 : 0;
                    });

                }

                // Listener to reset state of node text to hidden
                function nodeMouseLeave() {
                    /*jshint validthis: true */
                    d3.select(this).select('.node .text')
                        .style('visibility', 'hidden');

                    // Reset opacity of nodes and links
                    nodesContainer.style('opacity', 1);
                    linksContainer.style('opacity', 1);
                }

                // Listener to select node
                function nodeClick(node) {
                    /*jshint validthis: true */
                    // Toggle node selection
                    if (node.selected) {
                        selectedNodes.splice(selectedNodes.indexOf(node), 1); // Remove node from selected nodes
                        node.selected = false;
                    } else {
                        selectedNodes.push(node); // Add node to selected nodes
                        node.selected = true;
                    }
                    // Background color depends on selection boolean
                    d3.select(this).select('.node .background')
                        .style('fill', function() {
                            return node.selected ? 'red' : node.color;
                        });

                    // Show the connected pathes
                    if (selectedNodes.length === 2) {
                        showConnectedPath(selectedNodes[0], selectedNodes[1]);
                    }
                    else {
                        // Reset opacity of links
                        linksContainer
                            .selectAll('.link')
                            .style('opacity', 1);
                    }
                }

                // Zoom the graph by selecting an area
                //TODO
                function rectZoom() {
                    /*jshint validthis: true */
                    if (!isRectZoom) return;
                    var e = this,
                        origin = d3.mouse(e),
                        rect = svg.append('rect').attr('class', 'zoom');

                    origin[0] = Math.max(0, Math.min(width, origin[0]));
                    origin[1] = Math.max(0, Math.min(height, origin[1]));

                    d3.select(window)
                        .on("mousemove.zoomRect", function () {
                            var m = d3.mouse(e);
                            m[0] = Math.max(0, Math.min(width, m[0]));
                            m[1] = Math.max(0, Math.min(height, m[1]));
                            rect.attr("x", Math.min(origin[0], m[0]))
                                .attr("y", Math.min(origin[1], m[1]))
                                .attr("width", Math.abs(m[0] - origin[0]))
                                .attr("height", Math.abs(m[1] - origin[1]));
                        })
                        .on("mouseup.zoomRect", function () {
                            d3.select(window).on("mousemove.zoomRect", null).on("mouseup.zoomRect", null);
                            d3.select("body").classed("noselect", false);
                            var m = d3.mouse(e);
                            m[0] = Math.max(0, Math.min(width, m[0]));
                            m[1] = Math.max(0, Math.min(height, m[1]));
                            if (m[0] !== origin[0] && m[1] !== origin[1]) {
                                zoom.x(xScale.domain([origin[0], m[0]].sort()))
                                    .y(yScale.domain([origin[1], m[1]].map(yScale.invert).sort()));
                            }
                            rect.remove();
                            //container.attr('transform', 'translate(100,100)scale(3)');
                            zoom.on('zoom', zoomed);
                            svg.call(zoom);
                            zoom.event(svg);

                        }, true);
                    d3.event.stopPropagation();

                }

                /*
                 * API functions
                 */
                // Export the graph as a PNG
                function exportAsPNG(fileName, svg) {
                    getCanvasWithImage(svg, function(canvas) {
                        canvas.toBlob(function (blob) {
                            saveAs(blob, fileName + '.png');
                        });
                    });
                }

                // Export the graph as a SVG
                function exportAsSVG(filename, svg) {
                    saveAs(getSVGBlob(svg), filename + '.svg');
                }

                // Export the graph as a PDF
                function exportAsPDF(filename, svg) {
                    var pdf = new jsPDF('landscape');
                    getCanvasWithImage(svg, function(canvas) {
                        var imgData = canvas.toDataURL('image/png');
                        pdf.addImage(imgData, 'PNG', 0, 0);
                        pdf.save(filename + '.pdf');
                    });
                }

                /*
                 * Utility functions
                 * Centering graph, etc.
                 */
                //wrap text
                //http://bl.ocks.org/mbostock/7555321
                function wrap(text, width) {
                    text.each(function () {
                        var text = d3.select(this),
                            words = text.text().split(/\s+/).reverse(),
                            word,
                            line = [],
                            lineNumber = 0,
                            lineHeight = 0.2, // ems
                            y = text.attr("y"),
                            dy = parseFloat(text.attr("dy")),
                            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
                        while (word = words.pop()) {
                            line.push(word);
                            tspan.text(line.join(" "));
                            if (tspan.node().getComputedTextLength() > width) {
                                line.pop();
                                tspan.text(line.join(" "));
                                line = [word];
                                tspan = text.append("tspan").attr("x", 25).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                            }
                        }
                    });
                }
                // Center graph
                function centerGraph() {
                    //no molecules, nothing to do
                    if (nodes.length === 0) {
                        return;
                    }

                    // Get the bounding box
                    var minX = d3.min(nodes.map(function (d) {
                        return d.x;
                    }));
                    var minY = d3.min(nodes.map(function (d) {
                        return d.y;
                    }));

                    var maxX = d3.max(nodes.map(function (d) {
                        return d.x;
                    }));
                    var maxY = d3.max(nodes.map(function (d) {
                        return d.y;
                    }));

                    // The width and the height of the graph
                    var molWidth = maxX - minX;
                    var molHeight = maxY - minY;

                    // how much larger the drawing area is than the width and the height
                    var widthRatio = width / molWidth;
                    var heightRatio = height / molHeight;

                    // we need to fit it in both directions, so we scale according to
                    // the direction in which we need to shrink the most
                    var minRatio = Math.min(widthRatio, heightRatio) * 0.5;

                    // the new dimensions of the molecule
                    var newMolWidth = molWidth * minRatio;
                    var newMolHeight = molHeight * minRatio;

                    // translate so that it's in the center of the window
                    var xTrans = -(minX) * minRatio + (width - newMolWidth) / 2;
                    var yTrans = -(minY) * minRatio + (height - newMolHeight) / 2;


                    // do the actual moving
                    container.attr('transform',
                        'translate(' + [xTrans, yTrans] + ')' + ' scale(' + minRatio + ')');

                    // tell the zoomer what we did so that next we zoom, it uses the
                    // transformation we entered here
                    zoom.translate([xTrans, yTrans]);
                    zoom.scale(minRatio);
                }

                // Get the BLOB of the SVG. Used for API functions.
                function getSVGBlob(svg) {
                    return new Blob([getSVGHtml(svg)], {type: 'image/svg+xml'});
                }

                // Get the html of the svg. Used for API functions.
                function getSVGHtml(svg) {
                    return svg
                        .attr('version', 1.1)
                        .attr('xmlns', 'http://www.w3.org/2000/svg')
                        .node().parentNode.innerHTML;
                }

                // Export selected area
                function exportArea() {
                    d3.event.preventDefault();

                    var e = this,
                        origin = d3.mouse(e),
                        rect = svg.append('rect').attr('class', 'select');

                    origin[0] = Math.max(0, Math.min(width, origin[0]));
                    origin[1] = Math.max(0, Math.min(height, origin[1]));

                    d3.select(window)
                        .on("mousemove.areaExport", function () {
                            var m = d3.mouse(e);
                            m[0] = Math.max(0, Math.min(width, m[0]));
                            m[1] = Math.max(0, Math.min(height, m[1]));
                            rect.attr("x", Math.min(origin[0], m[0]))
                                .attr("y", Math.min(origin[1], m[1]))
                                .attr("width", Math.abs(m[0] - origin[0]))
                                .attr("height", Math.abs(m[1] - origin[1]));
                        })
                        .on("mouseup.areaExport", function () {
                            d3.select(window).on("mousemove.areaExport", null).on("mouseup.areaExport", null);
                            d3.select("body").classed("noselect", false);
                            var m = d3.mouse(e);
                            m[0] = Math.max(0, Math.min(width, m[0]));
                            m[1] = Math.max(0, Math.min(height, m[1]));
                            var viewBox = {
                                x: Math.min(origin[0], m[0]),
                                y: Math.min(origin[1], m[1]),
                                width: Math.max(origin[0], m[0]) - Math.min(origin[0], m[0]),
                                height: Math.max(origin[1], m[1]) - Math.min(origin[1], m[1])
                            };

                            rect.remove();
                            var copied = d3.select('body')
                                .append('div')
                                .append('svg')
                                .attr('id', 'copy')
                                .attr('width', width)
                                .attr('height', height)
                                .style('display', 'none')
                                .attr('viewBox', viewBox.x + ' ' + viewBox.y + ' ' + viewBox.width + ' ' + viewBox.height)
                                .html(svg.html());
                            exportAsSVG('test', copied);
                            copied.node().parentNode.remove();
                        }, true);
                    d3.event.stopPropagation();
                }

                // Generates a canvas with an image from the svg
                function getCanvasWithImage(svg, cb) {
                    var html = getSVGHtml(svg);

                    d3.select('body').append('canvas')
                        .attr('width', width)
                        .attr('height', height)
                        .style('display', 'none');
                    var canvas = document.querySelector("canvas"),
                        context = canvas.getContext("2d");

                    var imgsrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(html))); //TODO alternative for unescape
                    var image = new Image();
                    image.src = imgsrc;
                    image.onload = function () {
                        context.drawImage(image, 0, 0);
                        cb(canvas);
                    };
                }

                // Define arrow markers
                function initMarkers(svg, circleRadius, markerWidth, markerHeight) {
                    svg.append('svg:defs')
                        .selectAll('marker')
                        .data(['end'])      // Different link/path types can be defined here
                        .enter().append('svg:marker')    // This section adds in the arrows
                        .attr('id', function (d) {
                            return d;
                        })
                        .attr('viewBox', '0 -5 10 10')
                        .attr('refX', 21)
                        .attr('refY', -Math.sqrt(circleRadius) + 3.12)
                        .attr('markerWidth', markerWidth)
                        .attr('markerHeight', markerHeight)
                        .attr('orient', 'auto')
                        .append('svg:path')
                        .attr('d', 'M0,-5L10,0L0,5');
                }

                // Show the connected path between two nodes
                function showConnectedPath(source, end) {
                    var paths = [];
                    traverse(source.id, paths);

                    // Get path with fitting end
                    paths = paths.filter(function(path) {
                        return path[path.length - 1] === end.id;
                    });

                    // Flatten paths
                    paths = [].concat.apply([], paths).filter(function(item, pos, self) {
                        return self.indexOf(item) === pos;
                    });

                    linksContainer
                        .selectAll('.link')
                        .style('opacity', function(d) {
                            return paths.indexOf(d.source.id) !== -1 && paths.indexOf(d.target.id) !== -1 ? 1 : 0.2;
                        });
                }

                // Traverse the graph and get all paths from start node
                function traverse(start, paths) {
                    var visited = [];
                    var queue = [];
                    var next = [start];
                    var last;

                    while (next || next === 0) {
                        last = next[next.length - 1];
                        if (visited.indexOf(last) === -1) {
                            visited.push(last);
                            nodes.filter(function (d) {
                                if (last !== d.id && adjacencyMatrix[[last, d.id]]) {

                                    return true;
                                }
                                return false;
                            }).forEach(function (d) {
                                var tmp = angular.copy(next);
                                tmp.push(d.id);
                                paths.push(angular.copy(tmp));
                                queue.push(angular.copy(tmp));
                            });

                        }
                        next = queue.shift();
                    }
                }
            }
        };
    });
