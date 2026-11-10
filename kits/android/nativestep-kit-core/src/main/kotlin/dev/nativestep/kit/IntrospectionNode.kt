package dev.nativestep.kit

import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.JsonElement

/** What a ViewModel or navigator shows over the protocol (ARCHITECTURE.md §4, PROTOCOL.md §4). */
interface IntrospectionNode {
    val name: String
    fun state(): JsonElement

    /** Offered only while this node is focused. */
    val actions: List<NodeAction> get() = emptyList()

    /** Offered to every node below this one (navigators: `goBack`, `selectTab`, `dismiss`). */
    val lends: List<NodeAction> get() = emptyList()

    val child: IntrospectionNode? get() = null
}

class NodeAction internal constructor(
    val name: String,
    val title: String,
    val input: InputSchema?,
    val perform: (JsonElement) -> Unit,
)

fun NodeAction(name: String, title: String, perform: () -> Unit): NodeAction =
    NodeAction(name, title, null) { _ -> perform() }

/** A parameterized action (R13): input is validated against [schema], then decoded with [serializer]. */
fun <I> NodeAction(
    name: String,
    title: String,
    serializer: KSerializer<I>,
    schema: InputSchema,
    perform: (I) -> Unit,
): NodeAction = NodeAction(name, title, schema) { json -> perform(NodeJson.decodeFromJsonElement(serializer, json)) }
