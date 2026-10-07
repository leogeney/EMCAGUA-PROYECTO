package co.emcagua.api.empresa;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfiguracionServicio {
    private final ConfiguracionRepositorio repo;

    public ConfiguracionServicio(ConfiguracionRepositorio repo) { this.repo = repo; }

    /** La configuración siempre existe: si la tabla está vacía se crea con los valores por defecto. */
    @Transactional
    public Configuracion actual() {
        return repo.findAll().stream().findFirst().orElseGet(() -> repo.save(new Configuracion()));
    }
}
