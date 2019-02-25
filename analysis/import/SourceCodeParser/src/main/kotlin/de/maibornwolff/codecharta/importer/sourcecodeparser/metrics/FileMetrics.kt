package de.maibornwolff.codecharta.importer.sourcecodeparser.metrics

import java.io.Serializable

class FileMetrics() {

    private var metricsMap: MutableMap<String, Serializable> = HashMap()

    fun add(key: String, value: Serializable){
        metricsMap[key] = value
    }

    fun get(key: String) : Serializable?{
        return metricsMap[key]
    }


}