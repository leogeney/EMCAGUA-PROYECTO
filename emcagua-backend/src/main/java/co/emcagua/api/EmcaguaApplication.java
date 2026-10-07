package co.emcagua.api;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/** API del sistema inteligente de gestión de información de EMCAGUA APC. */
// Sin el usuario de prueba que Spring crea solo: las cuentas están en la base de datos
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableScheduling
@ConfigurationPropertiesScan
public class EmcaguaApplication {
    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("America/Bogota"));
        SpringApplication.run(EmcaguaApplication.class, args);
    }
}
