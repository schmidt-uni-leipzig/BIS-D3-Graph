/*global d3*/
/*jslint latedef:false*/
'use strict';

angular.module('d3graph', [])
    .directive('d3Graph', function ($log) {
        return {
            restrict: 'E',
            template: '<svg id="d3Graph"></svg>',
            scope: {
                data: '<',
                options: '<'
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
                var zoom = d3.behavior.zoom()
                    .scaleExtent([0.1, 10])
                    .x(xScale)
                    .y(yScale)
                    .on('zoom', zoomed);

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
                        .on('mousedown', rectZoom);
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
                        .call(drag); // Append node dragging

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
                        });

                    // Actual node
                    nodesContainer.append('circle')
                        .attr('class', 'node foreground')
                        .attr('r', circleRadius)
                        .style({
                            'fill': 'transparent',
                            'stroke': '#444',
                            'stroke-width': '1px',
                            'cursor': 'default'
                        })
                        .on('mouseenter', nodeMouseEnter)
                        .on('mouseleave', nodeMouseLeave);

                    // Node text, shown on mouseover
                    nodesContainer.append('text')
                        .attr('dx', 25)
                        .attr('dy', '.45em')
                        .attr('class', 'node text')
                        .text(function (d) {
                            return d.name;
                        })
                        .style('visibility', 'hidden');

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
                function zoomed() {
                    container.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
                }

                // Drag started
                function dragStarted(d) {
                    /*jshint validthis: true */
                    d3.event.sourceEvent.stopPropagation();

                    d3.select(this).classed('dragging', true);
                    force.start();
                }

                // Dragging
                function dragged(d) {
                    /*jshint validthis: true */
                    d3.select(this).attr('cx', d.x = d3.event.x).attr('cy', d.y = d3.event.y);
                }

                // Drag ended
                function dragEnded(d) {
                    /*jshint validthis: true */
                    d3.select(this).classed('dragging', false);
                }

                // Listener for placing mouse cursor on node
                // Shows node text
                function nodeMouseEnter() {
                    /*jshint validthis: true */
                    d3.select(this.parentNode).select('.node .text')
                        .style('visibility', 'visible');
                }

                // Listener to reset state of node text to hidden
                function nodeMouseLeave() {
                    /*jshint validthis: true */
                    d3.select(this.parentNode).select('.node .text')
                        .style('visibility', 'hidden');
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
                                console.log('here');
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
                 * Utility functions
                 * Centering graph, etc.
                 */
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

                // Expot graph as png/pdf/svg
                function exportGraph() {
                    var html = svg
                        .attr('version', 1.1)
                        .attr('xmlns', 'http://www.w3.org/2000/svg')
                        .node().parentNode.innerHTML;


                    // SVG save
                    var blob = new Blob([html], {type: 'image/svg+xml'});
                    //saveAs(blob, 'graph.svg');

                    // PNG save
                    var imgsrc = 'data:image/svg+xml;base64,' + btoa(html);
                    console.log(imgsrc);
                    var img = '<img src="' + imgsrc + '">';
                    //d3.select('body').append('div').html(img);

                    d3.select('body').append('canvas')
                        .attr('width', width)
                        .attr('height', height);
                    var canvas = document.querySelector("canvas"),
                        context = canvas.getContext("2d");

                    var image = new Image();
                    image.src = imgsrc;
                    image.onload = function () {
                        context.drawImage(image, 0, 0);

                        var canvasdata = canvas.toDataURL("image/png");

                        canvas.toBlob(function (blob) {
                            console.log(blob);
                            //saveAs(blob, 'graph.png');
                        });
                    };

                    //TODO PDF save
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
            }
        };
    });
