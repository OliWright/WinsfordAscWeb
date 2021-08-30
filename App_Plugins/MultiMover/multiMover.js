angular.module('umbraco').controller("EnkelMedia.NodeMoverAction.Controller", contentMyActionController);
function contentMyActionController($scope, $routeParams, $http, contentResource, eventsService, notificationsService, treeService, navigationService, dialogService, localizationService) {
    var dialog;
    var dialogOptions = $scope.dialogOptions;

    $scope.step = '1';
    $scope.ready = false;
    $scope.target = undefined;

    // Load child nodes based on the node that was right clicked node (dialogOptions.currentNode)
    $http.get("Backoffice/MultiMover/MultiMover/GetChildNodes?id=" + dialogOptions.currentNode.id).success(function (data) {
        $scope.nodes = data;
        $scope.ready = true;
    });

    $scope.showStep2 = function () {

        // check that there is at least 1 selected node - the error message is in english since the UI should validate this before so
        // it will be very rare that this error message shows up.
        if ($scope.selectedNodes().length <= 0) {
            notificationsService.error("No nodes selected", "You must selected at least one node to move.");
        }

        $scope.step = '2';
    }

    $scope.performMove = function() {
        
        // validation
        if (!$scope.target) {
            notificationsService.error("Please select a destination for the nodes.");
            return;
        }

        var model = {
            DestinationParentId: $scope.target.id,
            NodeIdsToMove : $scope.selectedNodes()
        }

        $http.post("Backoffice/MultiMover/MultiMover/MoveNodes", model).success(function (data) {


            // try/catch here - sometimes things just go wrong so bu using the try/catch the javascript execution will continoue and close the dialog.
            try {
                
                treeService.loadNodeChildren({ section: "content", node: dialogOptions.currentNode });

                var root = treeService.getTreeRoot(dialogOptions.currentNode);
                if (root) {
                    var child = treeService.getDescendantNode(root, $scope.target.id, "content");
                    treeService.loadNodeChildren({ section: "content", node: child });
                }

            } catch (e) { }

            localizationService.localize("multiMover_nodesMovedSuccessMessage").then(function (value) {
                notificationsService.success(value + '.');    
            });

            navigationService.hideDialog();
            
        }).error(function (data) {
            
            notificationsService.error("Could not perform action, info: " + data);

        });

    }

    $scope.selectedNodes = function () {

        var selectedNodes = [];

        if ($scope.nodes == undefined)
            return selectedNodes;

        for (var i = 0; i < $scope.nodes.length; i++) {
            if ($scope.nodes[i].selected) {
                selectedNodes.push($scope.nodes[i].id);
            }
        }

        return selectedNodes;

    }


    // Eventhandler for the umb-tree in step 2.
    $scope.dialogTreeEventHandler = $({});
    $scope.dialogTreeEventHandler.bind("treeNodeSelect", nodeSelectHandler);

    $scope.$on('$destroy', function () {
        $scope.dialogTreeEventHandler.unbind("treeNodeSelect", nodeSelectHandler);
    });

    function nodeSelectHandler(ev, args) {

        console.log(args);

        args.event.preventDefault();
        args.event.stopPropagation();

        if (args.node.metaData.listViewNode) {
            //check if list view 'search' node was selected
        }
        else {
            eventsService.emit("editors.content.moveController.select", args);

            if ($scope.target) {
                //un-select if there's a current one selected
                $scope.target.selected = false;
            }

            $scope.target = args.node;
            $scope.target.selected = true;
        }
    }


}