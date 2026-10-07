package co.emcagua.api.comun;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Valores de la sección "emcagua" de application.yml. */
@ConfigurationProperties(prefix = "emcagua")
public record EmcaguaProps(String secreto, int sesionHoras, String frontend, boolean datosDemo, String zonaHoraria) {}
