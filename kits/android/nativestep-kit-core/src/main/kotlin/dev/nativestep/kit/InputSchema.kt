package dev.nativestep.kit

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** The JSON Schema subset of PROTOCOL.md §5. Input is checked against it before it reaches a ViewModel (R13). */
sealed interface InputSchema {
    data class Violation(val path: String, val message: String)

    val typeName: String
    fun toJson(): JsonObject
    fun validate(value: JsonElement, path: String = ""): List<Violation>

    companion object {
        /** `required` defaults to every property. */
        fun obj(vararg properties: Pair<String, InputSchema>, required: List<String>? = null) =
            ObjectSchema(properties.toMap(), required)
        fun string(minLength: Int? = null, maxLength: Int? = null, oneOf: List<String>? = null) =
            StringSchema(minLength, maxLength, oneOf)
        fun integer(minimum: Long? = null, maximum: Long? = null) = IntegerSchema(minimum, maximum)
        fun number(minimum: Double? = null, maximum: Double? = null) = NumberSchema(minimum, maximum)
        fun boolean() = BooleanSchema
        fun array(items: InputSchema) = ArraySchema(items)
    }
}

private fun InputSchema.fail(path: String, message: String) = listOf(InputSchema.Violation(path, message))
private fun InputSchema.wrongType(path: String) = fail(path, "must be of type $typeName")
private val JsonElement.literal: JsonPrimitive? get() = (this as? JsonPrimitive)?.takeIf { !it.isString }

data class ObjectSchema(val properties: Map<String, InputSchema>, val required: List<String>?) : InputSchema {
    override val typeName = "object"
    override fun toJson() = buildJsonObject {
        put("type", typeName)
        put("properties", JsonObject(properties.mapValues { it.value.toJson() }))
        put("required", JsonArray((required ?: properties.keys.sorted()).map(::JsonPrimitive)))
    }
    override fun validate(value: JsonElement, path: String): List<InputSchema.Violation> {
        if (value !is JsonObject) return wrongType(path)
        return properties.keys.sorted().flatMap { key ->
            val field = value[key]
            when {
                field != null -> properties.getValue(key).validate(field, "$path/$key")
                (required ?: properties.keys).contains(key) -> fail("$path/$key", "is required")
                else -> emptyList()
            }
        }
    }
}

data class StringSchema(val minLength: Int?, val maxLength: Int?, val oneOf: List<String>?) : InputSchema {
    override val typeName = "string"
    override fun toJson() = buildJsonObject {
        put("type", typeName)
        minLength?.let { put("minLength", it) }
        maxLength?.let { put("maxLength", it) }
        oneOf?.let { put("enum", JsonArray(it.map(::JsonPrimitive))) }
    }
    override fun validate(value: JsonElement, path: String): List<InputSchema.Violation> {
        val s = (value as? JsonPrimitive)?.takeIf { it.isString }?.content ?: return wrongType(path)
        // Count Unicode code points, like Swift's String.count does for most text.
        val length = s.codePointCount(0, s.length)
        return when {
            minLength != null && length < minLength -> fail(path, "must have at least $minLength characters")
            maxLength != null && length > maxLength -> fail(path, "must have at most $maxLength characters")
            oneOf != null && s !in oneOf -> fail(path, "must be one of ${oneOf.joinToString()}")
            else -> emptyList()
        }
    }
}

data class IntegerSchema(val minimum: Long?, val maximum: Long?) : InputSchema {
    override val typeName = "integer"
    override fun toJson() = buildJsonObject {
        put("type", typeName)
        minimum?.let { put("minimum", it) }
        maximum?.let { put("maximum", it) }
    }
    override fun validate(value: JsonElement, path: String): List<InputSchema.Violation> {
        val n = value.literal?.content?.toLongOrNull() ?: return wrongType(path)
        return when {
            minimum != null && n < minimum -> fail(path, "must be ≥ $minimum")
            maximum != null && n > maximum -> fail(path, "must be ≤ $maximum")
            else -> emptyList()
        }
    }
}

data class NumberSchema(val minimum: Double?, val maximum: Double?) : InputSchema {
    override val typeName = "number"
    override fun toJson() = buildJsonObject {
        put("type", typeName)
        minimum?.let { put("minimum", it) }
        maximum?.let { put("maximum", it) }
    }
    override fun validate(value: JsonElement, path: String): List<InputSchema.Violation> {
        val n = value.literal?.takeIf { it.booleanOrNull == null }?.content?.toDoubleOrNull() ?: return wrongType(path)
        return when {
            minimum != null && n < minimum -> fail(path, "must be ≥ $minimum")
            maximum != null && n > maximum -> fail(path, "must be ≤ $maximum")
            else -> emptyList()
        }
    }
}

data object BooleanSchema : InputSchema {
    override val typeName = "boolean"
    override fun toJson() = buildJsonObject { put("type", typeName) }
    override fun validate(value: JsonElement, path: String) =
        if (value.literal?.booleanOrNull != null) emptyList() else wrongType(path)
}

data class ArraySchema(val items: InputSchema) : InputSchema {
    override val typeName = "array"
    override fun toJson() = buildJsonObject {
        put("type", typeName)
        put("items", items.toJson())
    }
    override fun validate(value: JsonElement, path: String): List<InputSchema.Violation> {
        if (value !is JsonArray) return wrongType(path)
        return value.flatMapIndexed { i, element -> items.validate(element, "$path/$i") }
    }
}
