angular.module('d3graph', [])
    .directive('d3Graph', function () {
            return {
                restrict: 'E',
                template: '<div class="d3Graph"></div>',
                replace: true,
                scope: {
                    data: '@',
                    options: '@'
                },
                link: function (scope, element, attrs) {
                    var DOCUMENT_ICON = '\uf0f6';
                    var GEAR_ICON = '\uf013';
                    var PERSON_ICON = '\uf007';
                    var BOOK_ICON = '\uf02d';
                    var OBJECT_ICON = '\uf02c';
                    var UNKNOWN_ICON = '\uf128';
                    var CIRCLE_ICON = '\uf111';
                    //convert data
                    if (scope.data == undefined){
                        var data = {
                            nodes: [
                                {
                                    id: 0,
                                    name: "Node1",
                                    color: "#fffff",
                                    type: "Document",
                                    longText: "Ein ganz besonders langer Text",
                                    group: 0,
                                    phase: "Planung"
                                },
                                {
                                    id: 1,
                                    name: "Node2",
                                    color: "#fffff",
                                    type: "Document",
                                    longText: "Ein noch längerer Text",
                                    group: 1
                                },
                                {
                                    id: 2,
                                    name: "Node3",
                                    color: "#fffff",
                                    type: "Document",
                                    longText: "Ein noch längerer Text Teil II",
                                    group: 2
                                },
                                {
                                    id: 3,
                                    name: "Node3",
                                    color: "#fffff",
                                    type: "Document",
                                    longText: "Ein noch längerer Text Teil II",
                                    group: 2
                                }
                            ],
                            edges: [
                                {
                                    source: 0,
                                    target: 1,
                                    text: "Relates to",
                                    color: "#12fff"
                                }, {
                                    source: 0,
                                    target: 2,
                                    text: "Relates to",
                                    color: "#12fff"
                                }]
                        };
                    }else{
                        var data = scope.data;
                    }
                    //Init Graph


                    var graph = initGraph(data);
                    //console.log(graph);
                    renderGraph(graph, ".d3Graph");
                    function initGraph(data) {
                        var graph = convert(data);
                        //--> data convert

                        graph.legend = {};
                        var nodes = data.nodes;
                        var typeKeys = {};
                        nodes.forEach(function (node) {
                            typeKeys[node.type] = true;
                        })
                        var types = Object.keys(typeKeys);
                        if (types.length > 0 && types[0] !== undefined) {
                            graph.legend.icons = buildIconLegend(types);
                        }
                        return graph;
                    }

                    var buildColorLegend = function (nodes) {
                        var legend = [];
                        var phases = [];
                        nodes.forEach(function (node) {
                            if (node !== null && node !== undefined && node.phase !== null) {

                                // not element of the phases array
                                if (phases.indexOf(node.phase) === -1) {
                                    legend.push({
                                        icon: CIRCLE_ICON,
                                        text: node.phase,
                                        color: node.color
                                    });
                                    phases.push(node.phase);
                                }
                            }
                        });

                        return legend;
                    };

                    function buildIconLegend(types) {
                        var legend = [];
                        types.forEach(function (type) {
                            legend.push({
                                icon: convertToIcon(type),
                                text: convertTypeToText(type)
                            });
                        });
                        return legend;
                    };

                    function convertTypeToText(type) {
                        switch (type) {
                            case 'BusinessTask':
                                return 'BusinessTask Icon';
                            case 'Document':
                                return 'Document Icon';
                            case 'Role':
                                return 'Role Icon';
                            case 'Documentation':
                                return 'Documentation Icon';
                            case 'TechnicalObject':
                                return 'TechnicalObject Icon';
                            default:
                                return 'Unknown Icon';
                        }
                    };

                    function convertToIcon(type) {
                        switch (type) {
                            case 'BusinessTask':
                                return GEAR_ICON;
                            case 'Document':
                                return DOCUMENT_ICON;
                            case 'Role':
                                return PERSON_ICON;
                            case 'Documentation':
                                return BOOK_ICON;
                            case 'TechnicalObject':
                                return OBJECT_ICON;
                            default:
                                return UNKNOWN_ICON;
                        }
                    };

                    function convert(data) {
                        var graphData = {};
                        graphData.nodes = [];
                        if (data.nodes) {
                            data.nodes.forEach(function (node) {
                                graphData.nodes.push({
                                    id: node.id,
                                    name: node.name,
                                    group: node.group,
                                    icon: convertToIcon(node.type),
                                    color: node.color,
                                    type: node.type,
                                    longtext: node.longText
                                });
                            });
                        }

                        graphData.links = [];
                        if (data.edges) {
                            data.edges.forEach(function (edge) {
                                graphData.links.push({
                                    source: graphData.nodes.map(function (e) {
                                        return e.id;
                                    }).indexOf(edge.source),
                                    target: graphData.nodes.map(function (e) {
                                        return e.id;
                                    }).indexOf(edge.target),
                                    text: edge.text,
                                    color: edge.color
                                });
                            });
                        }
                        return graphData;
                    };


                    function initSvg(elementName, width, height, keyup, keydown) {
                        var svg = d3.select(elementName)
                            .attr('tabindex', 1)
                            .on('keydown.brush', keydown)
                            .on('keyup.brush', keyup)
                            .each(function () {
                                this.focus();
                            })
                            .append('svg')
                            .attr('width', width)
                            .attr('height', height);

                        return svg;
                    };

                    /*
                     * Define arrow markers
                     */
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
                            .attr('strocke', 'red')
                            .append('svg:path')
                            .attr('d', 'M0,-5L10,0L0,5');
                    };

                    function renderGraph(graph, elementName, pathClass) {

                        clear(elementName);
                        if (graph === undefined) {
                            return;
                        }
                        if (graph.links === undefined && graph.nodes === undefined) {
                            return;
                        }

                        graph.links.forEach(function (d) {
                            d.source = graph.nodes[d.source];
                            d.target = graph.nodes[d.target];
                        });

                        var width = 1000, height = 700, shiftKey, ctrlKey;
                        var markerWidth = 9, markerHeight = 12, circleRadius = 10;

                        var colorLegendVisible = false;
                        var titleVisible = false;
                        var iconLegendVisible = false;

                        var xScale = d3.scale.linear()
                            .domain([0, width]).range([0, width]);
                        var yScale = d3.scale.linear()
                            .domain([0, height]).range([0, height]);

                        // append SVG container
                        var svg = initSvg(elementName, width, height, keyup, keydown);

                        // init arrow markers
                        initMarkers(svg, circleRadius, markerWidth, markerHeight);

                        var zoomer = d3.behavior.zoom()
                            .scaleExtent([0.1, 10])
                            .x(xScale)
                            .y(yScale)
                            .on('zoomstart', function () {
                                node.each(function (d) {
                                    d.selected = false;
                                    d.previouslySelected = false;
                                });
                                node.classed('selected', false);
                            })
                            .on('zoom', function () {
                                vis.attr('transform',
                                    'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
                            });

                        var svgGraph = svg.append('svg:g')
                            .call(zoomer);

                        svgGraph.append('svg:rect')
                            .attr('width', width)
                            .attr('height', height)
                            .attr('fill', 'transparent')
                            .attr('stroke', 'transparent')
                            .attr('stroke-width', 1)
                            .attr('id', 'zrect');

                        var vis = svgGraph.append('svg:g')
                            .attr('id', 'vis');

                        if (pathClass === undefined) {
                            pathClass = defaultPathClass;
                        }

                        var link = vis.append('svg:g')
                            .attr('id', 'lines')
                            .selectAll('path')
                            .data(graph.links).enter()
                            .append('path')
                            .attr('d', function (d) {
                                var dx = d.target.x - d.source.x,
                                    dy = d.target.y - d.source.y,
                                    dr = Math.sqrt(dx * dx + dy * dy);
                                return 'M' +
                                    d.source.x + ',' +
                                    d.source.y + 'A' +
                                    dr + ',' + dr + ' 0 0,1 ' +
                                    d.target.x + ',' +
                                    d.target.y;
                            })
                            .attr('class', pathClass)
                            .attr('marker-end', 'url(#end)')
                            ;

                        var nodeContainer = vis.append('g')
                            .attr('id', 'nodes')
                            .selectAll('node');

                        var node = nodeContainer
                            .data(graph.nodes)
                            .enter()
                            .append('g');

                        node.append('circle')
                            .attr('class', 'node nodebackground')
                            .attr('r', circleRadius)
                            .style('fill', function (d) {
                                return d.color;
                            });

                        node.append('svg:text')
                            .attr('class', 'nodeicon')
                            .text(function (d) {
                                return d.icon;
                            });

                        node.append('circle')
                            .attr('class', 'node nodeforeground')
                            .attr('r', circleRadius)
                            .on('dblclick', function (d) {
                                d3.event.stopPropagation();
                                connectedPaths(d);
                            })
                            .on('click', function (d) {
                                if (d3.event.defaultPrevented) {
                                    return;
                                }

                                if (shiftKey) {
                                    d3.select(this)
                                        .classed('selectednode', d.selected = !d.selected);
                                }
                            })
                            .on('mouseenter', function (d) {
                                if (!titleVisible) {
                                    d3.select(this.parentNode).select('.nodetext')
                                        .style('visibility', 'visible');
                                }
                                connectedNodes(d);
                            })
                            .on('mouseout', function () {
                                if (!titleVisible) {
                                    d3.select(this.parentNode).select('.nodetext')
                                        .style('visibility', 'hidden');
                                }
                                if (toggle === 0) {
                                    //Put them back to opacity=1
                                    node.style('opacity', 1);
                                    link.style('opacity', 1);
                                }
                            })
                            .call(d3.behavior.drag()
                                .on('dragstart', dragstarted)
                                .on('drag', dragged));

                        node.append('svg:text')
                            .attr('dx', 25)
                            .attr('dy', '.45em')
                            .attr('class', 'nodetext')
                            .style('visibility', 'hidden')
                            .text(function (d) {
                                return d.name;
                            })
                            /*
                             .call(wrap, 110)
                             */;

                        if (graph.legend.icons) {
                            var iconLegendBox = svg.append('svg:g')
                                .attr('id', 'iconlegend')
                                .style('visibility', 'hidden');

                            iconLegendBox.append('svg:rect')
                                .attr('width', 350)
                                .attr('height', ((graph.legend.icons.length + 1) * 30) + 10)
                                .attr('fill', 'lightgrey')
                                .attr('stroke', 'black')
                                .attr('stroke-width', 1)
                                .attr('class', 'legendbox');

                            iconLegendBox.selectAll('.icon')
                                .data(graph.legend.icons)
                                .enter()
                                .append('text')
                                .attr('class', 'icon')
                                .text(function (d) {
                                    return d.icon;
                                })
                                .style('color', function (d) {
                                    return d.color;
                                })
                                .attr('x', 20)
                                .attr('y', function (d, i) {
                                    return 5 + ((i + 1) * 30);
                                });

                            iconLegendBox.selectAll('.text')
                                .data(graph.legend.icons)
                                .enter()
                                .append('text')
                                .attr('class', 'text')
                                .text(function (d) {
                                    return d.text;
                                })
                                .attr('x', 50)
                                .attr('y', function (d, i) {
                                    return 5 + ((i + 1) * 30);
                                });
                        }

                        if (graph.legend.colors) {
                            var colorLegendBox = svg.append('svg:g')
                                .attr('id', 'colorlegend')
                                .style('visibility', 'hidden');

                            colorLegendBox.append('svg:rect')
                                .attr('width', 350)
                                .attr('height', ((graph.legend.colors.length + 1) * 30) + 10)
                                .attr('class', 'legendbox');

                            colorLegendBox.selectAll('.icon')
                                .data(graph.legend.colors)
                                .enter()
                                .append('text')
                                .attr('class', 'icon')
                                .text(function (d) {
                                    return d.icon;
                                })
                                .style('fill', function (d) {
                                    return d.color;
                                })
                                .attr('x', 20)
                                .attr('y', function (d, i) {
                                    return 5 + ((i + 1) * 30);
                                });

                            colorLegendBox.selectAll('.text')
                                .data(graph.legend.colors)
                                .enter()
                                .append('text')
                                .attr('class', 'text')
                                .text(function (d) {
                                    return d.text;
                                })
                                .attr('x', 50)
                                .attr('y', function (d, i) {
                                    return 5 + ((i + 1) * 30);
                                });

                        }

                        var force = d3.layout.force()
                            .linkDistance(170)
                            .charge(-2300)
                            .nodes(graph.nodes)
                            .links(graph.links)
                            .size([width, height])
                            .start()
                            .on('tick', function () {
                                link.attr('d', function (d) {
                                    var dx = d.target.x - d.source.x,
                                        dy = d.target.y - d.source.y,
                                        dr = Math.sqrt(dx * dx + dy * dy);
                                    return 'M' + d.source.x + ',' + d.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
                                });

                                node.attr('transform', function (d) {
                                    return 'translate(' + d.x + ',' + d.y + ')';
                                });
                            });

                        function keydown() {
                            shiftKey = d3.event.shiftKey || d3.event.metaKey;
                            ctrlKey = d3.event.ctrlKey;

                            console.log('d3.event', d3.event);

                            if (d3.event.keyCode === 67) {   //the 'c' key (center)
                                centerView();
                            }

                            if (d3.event.keyCode === 84) {   //the 't' key (title)
                                titleVisible = !titleVisible;
                                node.select('.nodetext')
                                    .style('visibility', titleVisible === true ? 'visible' : 'hidden');
                            }

                            if (d3.event.keyCode === 73) {   //the 'i' key (icons)
                                iconLegendVisible = !iconLegendVisible;
                                if (iconLegendVisible && colorLegendVisible) {
                                    colorLegendVisible = !colorLegendVisible;
                                    svg.select('#colorlegend')
                                        .style('visibility', colorLegendVisible === true ? 'visible' : 'hidden');
                                }
                                svg.select('#iconlegend')
                                    .style('visibility', iconLegendVisible === true ? 'visible' : 'hidden');
                            }

                            if (d3.event.keyCode === 76) {   //the 'l' key (legend)
                                colorLegendVisible = !colorLegendVisible;
                                if (iconLegendVisible && colorLegendVisible) {
                                    iconLegendVisible = !iconLegendVisible;
                                    svg.select('#iconlegend')
                                        .style('visibility', iconLegendVisible === true ? 'visible' : 'hidden');
                                }
                                svg.select('#colorlegend')
                                    .style('visibility', colorLegendVisible === true ? 'visible' : 'hidden');
                            }

                            if (shiftKey) {
                                svgGraph.call(zoomer)
                                    .on('mousedown.zoom', null)
                                    .on('touchstart.zoom', null)
                                    .on('touchmove.zoom', null)
                                    .on('touchend.zoom', null);

                                vis.selectAll('g.node')
                                    .on('mousedown.drag', null);
                            }
                        }

                        function keyup() {
                            shiftKey = d3.event.shiftKey || d3.event.metaKey;
                            ctrlKey = d3.event.ctrlKey;

                            svgGraph.call(zoomer);
                        }

                        function dragstarted(d) {
                            d3.event.sourceEvent.stopPropagation();
                            if (!d.selected && !shiftKey) {
                                // if this node isn't selected, then we have to unselect every other node
                                node.classed('selectednode', function (p) {
                                    return p.selected;
                                });
                            }

                            d3.select(d).classed('selectednode', function (x) {
                                return x.selected;
                            });

                            node.filter(function (d) {
                                    return d.selected;
                                })
                                .each(function (d) {
                                    d.fixed |= 2;
                                });
                        }

                        function dragged(/* d */) {
                            node.filter(function (d) {
                                    return d.selected;
                                })
                                .each(function (d) {
                                    d.x += d3.event.dx;
                                    d.y += d3.event.dy;

                                    d.px += d3.event.dx;
                                    d.py += d3.event.dy;
                                });

                            force.resume();
                        }

                        function centerView() {
                            // Center the view on the molecule(s) and scale it so that everything
                            // fits in the window

                            if (graph === null) {
                                return;
                            }

                            var nodes = graph.nodes;

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
                            var minRatio = Math.min(widthRatio, heightRatio) * 0.8;

                            // the new dimensions of the molecule
                            var newMolWidth = molWidth * minRatio;
                            var newMolHeight = molHeight * minRatio;

                            // translate so that it's in the center of the window
                            var xTrans = -(minX) * minRatio + (width - newMolWidth) / 2;
                            var yTrans = -(minY) * minRatio + (height - newMolHeight) / 2;


                            // do the actual moving
                            vis.attr('transform',
                                'translate(' + [xTrans, yTrans] + ')' + ' scale(' + minRatio + ')');

                            // tell the zoomer what we did so that next we zoom, it uses the
                            // transformation we entered here
                            zoomer.translate([xTrans, yTrans]);
                            zoomer.scale(minRatio);
                        };

                        //Toggle stores whether the highlighting is on
                        var toggle = 0;

                        //Create an array logging what is connected to what
                        var linkedByIndex = {};
                        for (var i = 0; i < graph.nodes.length; i++) {
                            linkedByIndex[i + ',' + i] = 1;
                        }

                        graph.links.forEach(function (d) {
                            linkedByIndex[d.source.index + ',' + d.target.index] = 1;
                        });

                        var mapping = [];
                        for (var j = 0; i < graph.nodes.length; j++) {
                            mapping.push([j, j]);
                        }

                        graph.links.forEach(function (d) {
                            mapping.push([d.source.index, d.target.index]);
                        });

                        function traverse(n, nodeneigbours) {
                            var visited = [];
                            var queue = [];
                            var next = n;
                            nodeneigbours.push(n.index);
                            while (next) {
                                if (visited.indexOf(next) === -1) {
                                    visited.push(next);
                                    node.filter(function (d) {
                                        if (next.index !== d.index && neighboring(next, d)) {
                                            console.log(next.name + ' is neigbour of ' + d.name);
                                            nodeneigbours.push(d.index);
                                            return d;
                                        }
                                    }).each(function (d) {
                                        queue.push(d);
                                    });
                                }
                                next = queue.shift();
                            }
                        }

                        //This function looks up whether a pair are neighbours
                        function neighboring(a, b) {
                            return linkedByIndex[a.index + ',' + b.index];
                        }

                        function connectedPaths(d) {
                            if (toggle === 0) {

                                var nodeneigbours = [];
                                traverse(d, nodeneigbours);

                                node.style('opacity', function (o) {
                                    return nodeneigbours.indexOf(o.index) !== -1 ? 1 : 0.2;
                                });

                                link.style('opacity', function (o) {
                                    return nodeneigbours.indexOf(o.source.index) !== -1 && nodeneigbours.indexOf(o.target.index) !== -1 ? 1 : 0.2;
                                });

                                toggle = 1;
                            } else {
                                //Put them back to opacity=1
                                node.style('opacity', 1);
                                link.style('opacity', 1);

                                toggle = 0;
                            }
                        }

                        function connectedNodes(d) {
                            if (toggle === 0) {

                                //Reduce the opacity of all but the neighbouring nodes
                                node.style('opacity', function (o) {
                                    return neighboring(d, o) || neighboring(o, d) ? 1 : 0;
                                });

                                link.style('opacity', function (o) {
                                    return d.index === o.source.index || d.index === o.target.index ? 1 : 0;
                                });
                            }
                        }
                    }

                    function clear(elementName) {
                        d3.select(elementName).selectAll('*').remove();
                    }

                    function defaultPathClass(d) {
                        return 'link ' + d.type;
                    }

                    function wrap(text, width) {
                        text.each(function () {
                            var text = d3.select(this),
                                words = text.text().split(/\s+/).reverse(),
                                word,
                                line = [],
                                lineNumber = 0,
                                lineHeight = 1, // ems
                                y = text.attr('y'),
                            //dy = parseFloat(text.attr('dy')),
                                tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y)
                            //.attr('dy', 0 + 'em')
                                ;
                            while (word = words.pop()) {
                                line.push(word);
                                tspan.text(line.join(' '));
                                if (tspan.node().getComputedTextLength() > width) {
                                    line.pop();
                                    tspan.text(line.join(' '));
                                    line = [word];
                                    tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + 'em').text(word);
                                }
                            }
                        });
                    }


                }
            }
        }
    );
