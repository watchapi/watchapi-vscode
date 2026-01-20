plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.25"
    id("org.jetbrains.intellij.platform") version "2.2.1"
}

group = "com.watchapi"
version = "0.1.0"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.2.4")
        pluginVerifier()
        zipSigner()
    }
}

kotlin {
    jvmToolchain(17)
}

intellijPlatform {
    pluginConfiguration {
        name = "WatchAPI"
        version = project.version.toString()
        ideaVersion {
            sinceBuild = "242"
            untilBuild = "251.*"
        }
    }

    signing {
        certificateChain = System.getenv("CERTIFICATE_CHAIN") ?: ""
        privateKey = System.getenv("PRIVATE_KEY") ?: ""
        password = System.getenv("PRIVATE_KEY_PASSWORD") ?: ""
    }

    publishing {
        token = System.getenv("PUBLISH_TOKEN") ?: ""
    }
}

tasks {
    wrapper {
        gradleVersion = "8.11"
    }
}
