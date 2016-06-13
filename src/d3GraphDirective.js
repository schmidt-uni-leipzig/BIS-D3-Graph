/*jshint latedef: nofunc */
(function () {
    'use strict';
    // this function is strict...

    /*global angular, d3, jsPDF */
    angular.module('d3graph', [])
        .directive('d3Graph', function ($rootScope, $log) {
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

                    //scales
                    var colorScale = d3.scale.category20(),
                        xScale = d3.scale.linear().domain([0, width]).range([0, width]),
                        yScale = d3.scale.linear().domain([0, height]).range([0, height]);

                    //nodes and links
                    var nodes = scope.data.nodes,
                        links = scope.data.edges,
                        originalNodes = [],
                        originalLinks = [];
                    var hullg, hull;
                    var gc = {},
                        grouped = false;
                    var curve = d3.svg.line()
                        .interpolate("cardinal-closed")
                        .tension(0.85);
                    var i = 0;
                    // Create object with every neighbour
                    var adjacencyMatrix = {};
                    var _nodeNeighbours = [];
                    nodes.forEach(function (node) {
                        adjacencyMatrix[[node.id, node.id]] = true;
                    });

                    // Create neighbours by links
                    links.forEach(function (edge) {
                        adjacencyMatrix[[edge.source, +edge.target]] = true;
                    });

                    // Options setting
                    var options = {};
                    options.filename = scope.options.filename || 'graph';
                    options.nodeClickCb = scope.options.nodeClickCb || function() {};


                    // Array of selected nodes
                    var selectedNodes = [];

                    /*
                     Utility Section
                     Define force layout, drag, zoom
                     */
                    var expandedGroups = {};
                    var groups = groupNodes(nodes);

                    for (i = 0; i < d3.keys(groups).length - 1; i += 1) {
                        convexHulls(groups[d3.keys(groups)[i]], d3.keys(groups)[i], 16);
                    }
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
                    var zoom = (function () {
                        var old = {};

                        return d3.behavior.zoom()
                            .scaleExtent([0.1, 10])
                            .x(xScale)
                            .y(yScale)
                            .on('zoomstart', function () {
                                zoomStarted(old);
                            })
                            .on('zoom', zoomed)
                            .on('zoomend', function () {
                                zoomEnded(old);
                            });
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
                    hullg = container.append('g');
                    var linksContainer = renderLinks(container);
                    var nodesContainer = renderNodes(container);
                    initHull();

                    //init hull
                    function removeHull() {
                        hullg.selectAll("path.hull").remove();
                    }

                    function initHull() {
                        hull = hullg.selectAll("path.hull")
                            .data(convexHulls(nodes, 0, 15))
                            .enter().append("path")
                            .attr("class", "hull")
                            .attr("d", drawCluster)
                            .style("fill", function (d) {
                                return gc[d.group];
                            })
                            .style("opacity", "1")
                            .style("stroke", function (d) {
                                return "#000000";
                            })
                            .style("stroke-opacity", "1.0")
                            .style("stroke-width", "1")
                            .on("click", function (d) {
                                /* if (d.group !== undefined) {
                                 groupHullNodes(createGroupNode(d.group), +d.group);
                                 removeHull();
                                 initHull();
                                 }
                                 updateForceLayout();*/
                                //expand[d.group] = false; init();
                            });
                    }

                    function createContextMenu(svg) {
                        var data = [
                            {name: 'SVG', fn: function() { exportAsSVG(options.filename, svg); }},
                            {name: 'PDF', fn: function() { exportAsPDF(options.filename, svg); }},
                            {name: 'PNG', fn: function() { exportAsPNG(options.filename, svg); }}
                        ];

                        var contextMenu = d3.select('body')
                            .append('div')
                            .attr('id', 'context-menu')
                            .style('position', 'absolute')
                            .on('mouseleave', function() {
                                d3.select(this).remove();
                            });

                        contextMenu.append('ul')
                            .selectAll('li')
                            .data(data)
                            .enter()
                            .append('li')
                            .text(function(d) { return 'Export as ' + d.name;})
                            .on('click', function(d) {d.fn();});

                        return contextMenu;
                    }

                    var node = svg.selectAll(".node"),
                        link = svg.selectAll(".link");
                    // Force step
                    force.on('tick', function () {
                        hull.data(convexHulls(nodes, 0, 13))
                            .attr("d", drawCluster);
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
                            .on('contextmenu', contextMenu);
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
                                return d.color || gc[d.group] || '#fff'; // default background color white
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
                            });

                        // Node text, shown on mouseover
                        nodesContainer.append('text')
                            .attr('dx', 25)
                            .attr('dy', '.45em')
                            .attr('class', 'node text')
                            .text(function (d) {
                                return d.name;
                            }).call(wrap, 50);
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

                        if (d3.event.keyCode === 71) { //g key
                            // -1 because last one is group undefined
                            if (!grouped) {
                                originalLinks = angular.copy(links);
                                for (var i = 0; i < d3.keys(groups).length - 1; i++) {
                                    var grpName = "";
                                    for (var u = 0; u < groups[d3.keys(groups)[i]].length; u++) {
                                        grpName += groups[d3.keys(groups)[i]][u].name + ": ";
                                    }
                                    removeHull();
                                    grpName = grpName.slice(0, grpName.length - 2);

                                    groupHullNodes({
                                        id: 100 + d3.keys(groups)[i],
                                        name: "Gruppe" + d3.keys(groups)[i] + ": " + grpName,
                                        size: 2,
                                        color: gc[d3.keys(groups)[i]],
                                        tag: "group"
                                    }, d3.keys(groups)[i]);
                                }
                            } else {
                                var deleteNodes = [];
                                var addNodes = [];
                                var addLinks = [];

                                for ( i = 0; i < nodes.length; i += 1) {
                                    if (nodes[i].tag === "group") {
                                        deleteNodes.push(i);
                                        removeAttachedLinksByIndex(nodes[i].id);
                                        addNodes.push(nodes[i].group);
                                    }
                                }
                                deleteNodes.reverse().forEach(function (i) {
                                    nodes.splice(i, 1);
                                });
                                addNodes.forEach(function (n) {
                                    nodes = nodes.concat(n);
                                });
                                var nodesMap = d3.map(nodes, function (d) {
                                    return d.id;
                                });
                                originalLinks.forEach(function (l) {
                                    var srcNode = nodesMap.get(l.source.id);
                                    var trgNode = nodesMap.get(l.target.id);
                                    var newLink = l;
                                    newLink = {source: srcNode, target: trgNode, text: l.text};
                                    links.push(newLink);
                                });
                                initHull();

                            }
                            updateAdjacencyMatrix();
                            updateForceLayout();
                            toggleGrouped();
                        }
                    }

                    // KeyUp
                    // Mostly reseting states
                    function keyUp() {

                    }

                    // Zoom
                    function zoomStarted(old) {
                        if (d3.event.sourceEvent && d3.event.sourceEvent.button !== 0) { // no left click
                            old.translation = zoom.translate();
                            old.scale = zoom.scale();
                        }
                    }

                    function zoomed() {
                        if (d3.event.sourceEvent && d3.event.sourceEvent.button !== 0) return; // no left click
                        container.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
                    }

                    function zoomEnded(old) {
                        if (d3.event.sourceEvent && d3.event.sourceEvent.button !== 0) {
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
                        nodesContainer.style('opacity', function (node) {
                            // Is there a connection between nodes?
                            return adjacencyMatrix[[selectedNode.id, node.id]] || adjacencyMatrix[[node.id, selectedNode.id]] ? 1 : 0;
                        });

                        // Hide all links that don't connect to the selected node
                        linksContainer.style('opacity', function (link) {
                            // Selected node target or source?
                            return selectedNode.id === link.source.id || selectedNode.id === link.target.id ? 1 : 0;
                        });

                    }

                    // Listener to reset state of node text to hidden
                    function nodeMouseLeave() {
                        /*jshint validthis: true */
                        d3.select(this).select('.node .text');
                        //.style('visibility', 'hidden');

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
                            .style('fill', function () {
                                return node.selected ? 'red' : node.color;
                            });

                        options.nodeClickCb(selectedNodes); // Call options cb
                        $rootScope.$digest(); // Apply digest cycle


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

                    /*
                     * API functions
                     */
                    // Export the graph as a PNG
                    function exportAsPNG(fileName, svg) {
                        getCanvasWithImage(svg, function (canvas) {
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
                        getCanvasWithImage(svg, function (canvas) {
                            var imgData = canvas.toDataURL('image/png');
                            pdf.addImage(imgData, 'PNG', 0, 0);
                            pdf.save(filename + '.pdf');
                        });
                    }

                    /*
                     * Utility functions
                     * Centering graph, etc.
                     */
                    // Every node is a neighbour of himself
                    function updateAdjacencyMatrix() {
                        nodes.forEach(function (node) {
                            adjacencyMatrix[[node.id, node.id]] = true;
                        });

                        // Create neighbours by links
                        links.forEach(function (edge) {
                            adjacencyMatrix[[edge.source.id, +edge.target.id]] = true;
                        });
                    }

                    function toggleGrouped() {
                        grouped = !grouped;
                    }

                    function drawCluster(d) {
                        if (!isNaN(d.path[0][0]))
                            return curve(d.path); // 0.8
                    }

                    function updateForceLayout() {
                        //Data JOIN
                        linksContainer = linksContainer.data(links, function (d) {
                            return d.source.id + "-" + d.target.id;
                        });
                        //ENTER
                        var linkEnter = linksContainer.enter()
                            .append('g')
                            .attr('class', 'link');
                        linkEnter
                            .append('path')
                            .attr('class', 'link')
                            //.attr('marker-end', 'url(#offset)')
                            .attr('marker-end', function (d) {
                                if (d.target.tag !== "group")
                                    return 'url(#offset)';
                                else
                                    return 'url(#end)';
                            })
                            .style('stroke', function (d) {
                                return d.color || '#777';
                            })
                            .style({
                                'stroke-width': '2px',
                                'stroke-dasharray': '2 2'
                            });
                        linkEnter
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
                        linkEnter
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
                        linksContainer.exit().remove();

                        nodesContainer = nodesContainer.data(nodes, function (d) {
                            return d.id;
                        });
                        var nodeEnter = nodesContainer.enter().append('g')
                            .attr('class', 'node')
                            .call(drag) // Append node dragging
                            .on('mouseenter', nodeMouseEnter) // Mouse enter show label and neighbours
                            .on('mouseleave', nodeMouseLeave) // Reset label and neighbours
                            .on('click', nodeClick);
                        nodeEnter.append('circle')
                            .attr('class', 'node background')
                            .attr('r', function (d) {
                                if (d.size)
                                    return d.size * circleRadius;
                                else
                                    return circleRadius;
                            })
                            .style('fill', function (d) {
                                return d.color || '#fff'; // default background color white
                            });
                        nodeEnter.append('text')
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
                        nodeEnter.append('circle')
                            .attr('class', 'node foreground')
                            .attr('r', function (d) {
                                if (d.size)
                                    return d.size * circleRadius;
                                else
                                    return circleRadius;
                            })
                            .style({
                                'fill': 'transparent',
                                'stroke': '#444',
                                'stroke-width': '1px',
                                'cursor': 'default'
                            });

                        // Node text, shown on mouseover
                        nodeEnter.append('text')
                            .attr('dx', 25)
                            .attr('dy', '.45em')
                            .attr('class', 'node text')
                            .text(function (d) {
                                return d.name;
                            }).call(wrap, 80);
                        //.style('visibility', 'hidden');
                        nodesContainer.exit().remove();

                        force.start();
                    }

                    /*http://bl.ocks.org/GerHobbelt/3071239
                     *creates hull
                     *input :
                     *   nodes from group
                     *   index of group
                     *   offset around point coordinates
                     */
                    function convexHulls(nodes, index, offset) {
                        var hulls = {};
                        // create point sets
                        for (var k = 0; k < nodes.length; ++k) {
                            var n = nodes[k];
                            if (getGroup(n) === undefined) continue;
                            if (n.size) continue;
                            var i = getGroup(n),
                                l = hulls[i] || (hulls[i] = []);
                            l.push([n.x - offset, n.y - offset]);
                            l.push([n.x - offset, n.y + offset]);
                            l.push([n.x + offset, n.y - offset]);
                            l.push([n.x + offset, n.y + offset]);
                        }

                        // create convex hulls
                        var hullset = [];
                        for (i in hulls) {
                            hullset.push({group: i, path: d3.geom.hull(hulls[i])});
                        }
                        return hullset;
                    }

                    function removeNodesByGroupID(groupID) {
                        //links.splice(1, 1);
                        var groupNodes = groups[groupID];
                        for (var n = 0; n < groupNodes.length; n++) {
                            removeNodeByName(groupNodes[n].name);
                            // removeAttachedLinksByName(groupNodes[n].name)
                        }

                    }

                    function removeAttachedLinksByIndex(i) {
                        var delLinks = [];
                        for (var l = 0; l < links.length; l++) {
                            if ((i === links[l].source.id || i === links[l].target.id)) {
                                delLinks.push(l);
                            }
                        }
                        delLinks.reverse().forEach(function (i) {
                            links.splice(i, 1);
                        });

                    }

                    function removeAttachedLinksByName(name) {
                        var newLinks = links;
                        for (var l = 0; l < links.length; l++) {
                            if (name === links[l].source.name || name === links[l].target.name) {
                                newLinks.splice(l, 1);
                            }
                        }
                        links = newLinks;
                    }

                    function removeNodeByName(n) {
                        var newNodes = nodes;
                        for (var i = 0; i < nodes.length; i++) {
                            if (getName(nodes[i]) === n) {
                                newNodes.splice(i, 1);
                            }
                        }
                        nodes = newNodes;

                    }

                    function groupHullNodes(n, i) {
                        removeNodesByGroupID(i);
                        expandedGroups[i] = true;
                        n.group = groups[i];
                        n.x = groups[i][0].x;
                        n.y = groups[i][0].y;

                        //find related links
                        groups[i].forEach(function (node) {
                            for (var l = 0; l < links.length; l++) {
                                if (node.name === links[l].source.name) {
                                    links[l].source = n;
                                }
                                if (node.name === links[l].target.name) {
                                    links[l].target = n;
                                }
                            }

                        });
                        nodes.push(n);
                    }

                    function isExpanded(groupID) {
                        return expandedGroups[groupID];

                    }

                    function groupNodes(n) {
                        var nodes = n;
                        var gm = {};

                        for (var i = 0; i < nodes.length; i++) {
                            if (!gm[getGroup(nodes[i])]) {
                                gm[getGroup(nodes[i])] = [];
                                expandedGroups[getGroup(nodes[i])] = false;
                                gc[getGroup(nodes[i])] = (colorScale(Math.floor(Math.random() * (19 + 1))));
                            }
                            gm[getGroup(nodes[i])].push(nodes[i]);
                        }
                        return gm;
                    }

                    //get node group
                    function getGroup(n) {
                        return n.group;
                    }

                    function getID(n) {
                        return n.id;
                    }

                    function getName(n) {
                        return n.name;
                    }

                    //wrap text
                    //http://bl.ocks.org/mbostock/7555321
                    function wrap(text, width) {
                        text.each(function () {
                            var text = d3.select(this),
                                words = text.text().split(/\s+/).reverse(),
                                word,
                                line = [],
                                lineNumber = 0,
                                lineHeight = 0.19, // ems
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

                    // Context menu
                    // Right click drag to select area and export area as SVG/PDF/PNG
                    // Just right click to export full svg
                    function contextMenu() {
                        d3.event.preventDefault();

                        var e = this,
                            origin = d3.mouse(e),
                            rect = svg.append('rect').attr('class', 'select');

                        origin[0] = Math.max(0, Math.min(width, origin[0]));
                        origin[1] = Math.max(0, Math.min(height, origin[1]));

                        d3.select(window)
                            .on("mousemove.contextMenu", function () {
                                var m = d3.mouse(e);
                                m[0] = Math.max(0, Math.min(width, m[0]));
                                m[1] = Math.max(0, Math.min(height, m[1]));
                                rect.attr("x", Math.min(origin[0], m[0]))
                                    .attr("y", Math.min(origin[1], m[1]))
                                    .attr("width", Math.abs(m[0] - origin[0]))
                                    .attr("height", Math.abs(m[1] - origin[1]));
                            })
                            .on("mouseup.contextMenu", function () {
                                d3.select(window).on("mousemove.contextMenu", null).on("mouseup.contextMenu", null);
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

                                // Check for min size of viewBox
                                if (viewBox.width > 50 && viewBox.height > 50) {
                                    rect.remove();

                                    // Create copy of svg and set viewBox to selected area
                                    var copied = d3.select('body')
                                        .append('div')
                                        .append('svg')
                                        .attr('id', 'copy')
                                        .attr('width', width)
                                        .attr('height', height)
                                        .style('display', 'none')
                                        .attr('viewBox', viewBox.x + ' ' + viewBox.y + ' ' + viewBox.width + ' ' + viewBox.height)
                                        .html(svg.html());

                                    // Create context menu and save svg in viewbox
                                    createContextMenu(copied)
                                        .style('left', (m[0] + 20) + 'px')
                                        .style('top', m[1] + 'px')
                                        .style('display', 'inline-block');

                                    // Remove viewbox svg
                                    copied.node().parentNode.remove();
                                } else {
                                    rect.remove();

                                    // Create context menu und save whole svg
                                    createContextMenu(svg)
                                        .style('left', (m[0] + 20) + 'px')
                                        .style('top', m[1] + 'px')
                                        .style('display', 'inline-block');
                                }
                            }, true);
                        d3.event.stopPropagation();
                    }

                    // Generates a canvas with an image from the svg
                    function getCanvasWithImage(svg, cb) {
                        var html = getSVGHtml(svg);

                        var appeneded = d3.select('body').append('canvas')
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
                            appeneded.remove();
                        };
                    }

                    // Define arrow markers
                    function initMarkers(svg, circleRadius, markerWidth, markerHeight) {
                        svg.append('svg:defs')
                            .selectAll('marker')
                            .data([{name: 'end', refY: (-Math.sqrt(circleRadius) + 3.12), refX: 21}, {
                                name: 'offset',
                                refY: (-Math.sqrt(circleRadius) + 3.12),
                                refX: 30
                            }])      // Different link/path types can be defined here
                            .enter().append('svg:marker')    // This section adds in the arrows
                            .attr('id', function (d) {
                                return d.name;
                            })
                            .attr('viewBox', '0 -5 10 10')
                            //.attr('refX', 21)
                            .attr('refX', function (d) {
                                return d.refX;
                            })
                            //.attr('refY', -Math.sqrt(circleRadius) + 3.12)
                            .attr('refY', function (d) {
                                return d.refY;
                            })
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
                        paths = paths.filter(function (path) {
                            return path[path.length - 1] === end.id;
                        });

                        // Flatten paths
                        paths = [].concat.apply([], paths).filter(function (item, pos, self) {
                            return self.indexOf(item) === pos;
                        });

                        linksContainer
                            .selectAll('.link')
                            .style('opacity', function (d) {
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
}());
