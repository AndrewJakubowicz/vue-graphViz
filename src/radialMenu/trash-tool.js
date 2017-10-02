
module.exports = (state, graph, radialMenu) => {
    let trashIcon = document.getElementById("menu-delete-btn");



    let map = state.nodeMap;
    trashIcon.addEventListener("click", () => {
        let hash = String(state.currentNode.data.hash);
        
        if (map.delete(hash)){
            graph.removeNode(hash)
        }

        // Make the menu disappear after the node is deleted.
        radialMenu.style.display = "none";
    })
}