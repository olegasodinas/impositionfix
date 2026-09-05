// Sample test plugin
window.impositionfix.registerPlugin({
    name: 'hello-world',
    version: '1.0.0',
    init: function(api) {
        console.log('Hello from plugin:', api);
    }
});
