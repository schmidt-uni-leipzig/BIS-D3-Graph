/**
 * Created by Toni Pohl on 10.05.16.
 */
'use strict';

describe('Directive: d3GraphDirective', function() {
    var scope, element, $compile,
        template = '<d3-graph data="data" options="options"></d3-graph>';

    function createDirective() {
        var elem;

        scope.data = {
            nodes: [
                {
                    id: 0,
                    name: "Node1",
                    color: "#fff",
                    type: '\uf0f6',
                    longText: "Ein ganz besonders langer Text",
                    group: 0,
                    phase: "Planung"
                },
                {
                    id: 1,
                    name: "Node2",
                    color: "#fff",
                    type: '\uf0f6',
                    longText: "Ein noch längerer Text",
                    group: 1
                },
                {
                    id: 2,
                    name: "Node3",
                    color: "#fff",
                    type: '\uf0f6',
                    longText: "Ein noch längerer Text Teil II",
                    group: 2
                },
                {
                    id: 3,
                    name: "Node4",
                    color: "#fff",
                    type: '\uf0f6',
                    longText: "Ein noch längerer Text Teil II",
                    group: 2
                }
            ],
            edges: [
                {
                    source: 0,
                    target: 1,
                    text: "Relates to",
                    color: "#777"
                }, {
                    source: 0,
                    target: 2,
                    text: "Relates to",
                    color: "#777"
                }
            ]
        };

        scope.options = {};

        elem = angular.element(template);
        angular.element(document.body).prepend(elem);
        $compile(elem)(scope);
        scope.$digest();

        return elem;
    }

    beforeEach(module('d3graph'));

    beforeEach(function() {
        inject(function($rootScope, _$compile_) {
            scope = $rootScope.$new();
            $compile = _$compile_;
        });
    });

    afterEach(function() {
        if(element) element.remove();
    });

    it('should get initial values', function() {
        element = createDirective();
        var links = element.find('#links');
        var nodes = element.find('#nodes');

        expect(links.children().length).toBe(2);
        expect(nodes.children().length).toBe(4);
    });
});