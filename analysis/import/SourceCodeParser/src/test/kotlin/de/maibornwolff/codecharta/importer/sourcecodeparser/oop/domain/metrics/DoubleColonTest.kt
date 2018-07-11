package de.maibornwolff.codecharta.importer.sourcecodeparser.oop.domain.metrics

import de.maibornwolff.codecharta.importer.sourcecodeparser.core.domain.metrics.MetricType
import de.maibornwolff.codecharta.importer.sourcecodeparser.core.domain.metrics.SingleMetricTable
import de.maibornwolff.codecharta.importer.sourcecodeparser.oop.`~res`.assertThatMetricElement
import de.maibornwolff.codecharta.importer.sourcecodeparser.oop.`~res`.extractBaseFolder
import de.maibornwolff.codecharta.importer.sourcecodeparser.core.domain.tagged.TaggableLines
import de.maibornwolff.codecharta.importer.sourcecodeparser.oop.infrastructure.antlr.java.Antlr
import org.junit.Test
import java.io.IOException
import java.nio.file.Files
import java.nio.file.Paths

class DoubleColonTest {
    @Test
    @Throws(IOException::class)
    fun annotation_example_has_correct_rloc_count() {
        val resource = "$extractBaseFolder/java/DoubleColon.java"
        val sourceCode = TaggableLines(OopLanguage.JAVA, Files.readAllLines(Paths.get(javaClass.classLoader.getResource(resource)!!.toURI())))
        Antlr.addTags(sourceCode)

        val metricExtractor = SingleMetricTable(sourceCode, OopMetricCalculationStrategy())

        assertThatMetricElement(metricExtractor) { it.sum[MetricType.RLoc]}.isEqualTo(16)
    }
}