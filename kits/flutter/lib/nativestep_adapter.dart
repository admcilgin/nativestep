/// The fixed core of the Flutter adapter. A per-project binding builds [StepNode]s
/// from the app's own state and passes fixture-backed services into the app.
library;

export 'src/fixtures.dart' show FixtureError, FixtureStore;
export 'src/node.dart' show InputSchema, StepAction, StepNode;
export 'src/server.dart' show StepServer, ProtocolError;
