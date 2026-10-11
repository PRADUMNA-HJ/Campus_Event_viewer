package com.campuspulse.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.ResourcePropertySource;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Validates that PostgreSQL and Production profile configuration files
 * maintain strictly valid drivers, dialect, Hikari pool sizing, and hardened security settings.
 */
@DisplayName("PostgreSQL Profile Configuration Tests")
class PostgresProfileConfigurationTest {

    @Test
    @DisplayName("application-postgres.properties contains valid driver, dialect, pool, and security settings")
    void postgresPropertiesContainExpectedSettings() throws IOException {
        ResourcePropertySource propertySource = new ResourcePropertySource(new ClassPathResource("application-postgres.properties"));

        assertThat(propertySource.getProperty("spring.datasource.driver-class-name"))
                .isEqualTo("org.postgresql.Driver");

        assertThat(propertySource.getProperty("spring.jpa.properties.hibernate.dialect"))
                .isEqualTo("org.hibernate.dialect.PostgreSQLDialect");

        assertThat(propertySource.getProperty("spring.h2.console.enabled"))
                .isEqualTo("false");

        assertThat(propertySource.getProperty("spring.datasource.hikari.pool-name"))
                .isEqualTo("CampusPulseHikariPool");

        assertThat(propertySource.getProperty("spring.datasource.hikari.maximum-pool-size"))
                .isEqualTo("${DB_POOL_MAX_SIZE:10}");

        assertThat(propertySource.getProperty("spring.datasource.hikari.minimum-idle"))
                .isEqualTo("${DB_POOL_MIN_IDLE:2}");

        assertThat(propertySource.getProperty("spring.datasource.hikari.leak-detection-threshold"))
                .isEqualTo("60000");

        assertThat(propertySource.getProperty("spring.datasource.hikari.idle-timeout"))
                .isEqualTo("300000");

        assertThat(propertySource.getProperty("spring.datasource.hikari.connection-timeout"))
                .isEqualTo("20000");
    }

    @Test
    @DisplayName("application-prod.properties enforces validate ddl-auto, disabled H2 console, and strict pool")
    void prodPropertiesContainExpectedHardenedSettings() throws IOException {
        ResourcePropertySource propertySource = new ResourcePropertySource(new ClassPathResource("application-prod.properties"));

        assertThat(propertySource.getProperty("spring.datasource.driver-class-name"))
                .isEqualTo("org.postgresql.Driver");

        assertThat(propertySource.getProperty("spring.jpa.hibernate.ddl-auto"))
                .isEqualTo("${SPRING_JPA_HIBERNATE_DDL_AUTO:validate}");

        assertThat(propertySource.getProperty("spring.jpa.show-sql"))
                .isEqualTo("false");

        assertThat(propertySource.getProperty("spring.h2.console.enabled"))
                .isEqualTo("false");

        assertThat(propertySource.getProperty("spring.datasource.hikari.pool-name"))
                .isEqualTo("CampusPulseProdPool");

        assertThat(propertySource.getProperty("spring.datasource.hikari.maximum-pool-size"))
                .isEqualTo("${DB_POOL_MAX_SIZE:15}");
    }
}
