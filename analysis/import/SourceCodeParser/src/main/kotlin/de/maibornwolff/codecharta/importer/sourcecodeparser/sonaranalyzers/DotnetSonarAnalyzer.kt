package de.maibornwolff.codecharta.importer.sourcecodeparser.sonaranalyzers

import de.maibornwolff.codecharta.importer.sourcecodeparser.NullFileLinesContextFactory
import org.sonar.api.SonarQubeSide
import org.sonar.api.batch.sensor.SensorContext
import org.sonar.api.batch.sensor.internal.SensorContextTester
import org.sonar.api.config.Configuration
import org.sonar.api.config.internal.MapSettings
import org.sonar.api.internal.SonarRuntimeImpl
import org.sonar.api.issue.NoSonarFilter
import org.sonar.api.utils.Version
import org.sonarsource.dotnet.shared.plugins.*
import org.sonar.api.batch.fs.InputFile
import org.sonar.api.batch.fs.internal.TestInputFileBuilder
import org.sonar.api.batch.fs.internal.DefaultInputFile
import java.io.File
import java.nio.charset.StandardCharsets


class DotnetSonarAnalyzer(verbose: Boolean = false, searchIssues: Boolean = true) : SonarAnalyzer(verbose, searchIssues) {
    override val FILE_EXTENSION = "vb"
    private val SONAR_VERSION_MAJOR = 7
    private val SONAR_VERSION_MINOR = 3

    override fun createContext() {
        sensorContext = SensorContextTester.create(baseDir)
        sensorContext.setRuntime(SonarRuntimeImpl.forSonarQube(Version.create(SONAR_VERSION_MAJOR, SONAR_VERSION_MINOR), SonarQubeSide.SERVER))
    }

    override fun buildSonarComponents() {
        // TODO: Nothing to do here?
    }

    override fun addFileToContext(fileName: String) {
        val inputFile = TestInputFileBuilder.create("moduleKey", fileName)
                .setModuleBaseDir(this.baseDir.toPath())
                .setCharset(StandardCharsets.UTF_8)
                .setType(InputFile.Type.MAIN)
                .setLanguage("vbnet")   // TODO: Replace with appropriate variable
                .initMetadata(fileContent(File("$baseDir/$fileName"), StandardCharsets.UTF_8))
                .build()
        this.sensorContext.fileSystem().add(inputFile)
    }

    override fun executeScan() {
        createContext()
        val metadata: DotNetPluginMetadata = VbNetPluginMetadata()
        val protobufDataImporter = ProtobufDataImporter(NullFileLinesContextFactory(), NoSonarFilter())
        val reportPathCollector = ReportPathCollector()
        val configuration: Configuration = MapSettings().asConfig()
        val abstractConfiguration = object : AbstractConfiguration(configuration, "vb") {}
        val roslynDataImporter = RoslynDataImporter(abstractConfiguration)
        val sensor = DotNetSensor(metadata, reportPathCollector, protobufDataImporter, roslynDataImporter)
        sensor.execute(sensorContext)
    }
}