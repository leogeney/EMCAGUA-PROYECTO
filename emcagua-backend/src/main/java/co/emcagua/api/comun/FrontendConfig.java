package co.emcagua.api.comun;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Sirve el frontend ya compilado (carpeta dist de emcagua-frontend) en la misma dirección de la API:
 * con un solo programa corriendo, http://localhost:8080 abre el sistema completo.
 * Las rutas de la aplicación (/usuarios, /pagos…) devuelven index.html para que React Router las maneje.
 */
@Configuration
public class FrontendConfig implements WebMvcConfigurer {
    private final String carpeta;

    public FrontendConfig(@Value("${emcagua.frontend-dist:file:../emcagua-frontend/dist/}") String carpeta) {
        this.carpeta = carpeta.endsWith("/") ? carpeta : carpeta + "/";
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registro) {
        registro.addResourceHandler("/**")
            .addResourceLocations(carpeta)
            .resourceChain(false)
            .addResolver(new PathResourceResolver() {
                @Override
                protected Resource getResource(String ruta, Resource ubicacion) throws IOException {
                    if (ruta.startsWith("api/")) return null;
                    Resource r = ubicacion.createRelative(ruta);
                    if (r.exists() && r.isReadable()) return r;
                    // Archivos que no existen (con extensión) → 404; rutas de la aplicación → index.html
                    if (ruta.substring(ruta.lastIndexOf('/') + 1).contains(".")) return null;
                    Resource index = ubicacion.createRelative("index.html");
                    return index.exists() ? index : null;
                }
            });
    }
}
