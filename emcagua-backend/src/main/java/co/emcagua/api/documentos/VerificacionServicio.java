package co.emcagua.api.documentos;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.LocalDate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Service;

import co.emcagua.api.comun.EmcaguaProps;
import co.emcagua.api.facturacion.FacturacionServicio;

/**
 * Código de seguridad de los QR (facturas, recibos y documentos): HMAC-SHA256 de los datos con la clave secreta del servidor.
 * Si alguien cambia el nombre, el valor o el número del papel, el código deja de coincidir; sin la clave nadie puede fabricar uno válido.
 */
@Service
public class VerificacionServicio {
    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I
    private final byte[] clave;

    public VerificacionServicio(EmcaguaProps props) { this.clave = ("qr|" + props.secreto()).getBytes(StandardCharsets.UTF_8); }

    public String firmar(Object... partes) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(clave, "HmacSHA256"));
            StringBuilder sb = new StringBuilder();
            for (Object o : partes) sb.append(o).append('|');
            byte[] h = mac.doFinal(sb.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (int i = 0; i < 8; i++) out.append(ALFABETO.charAt((h[i] & 0xff) % 32));
            return out.substring(0, 4) + "-" + out.substring(4);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    public String codigoFactura(String numero, String predio, long total) { return firmar("FAC", numero, predio, total); }

    public String codigoRecibo(String numero, String predio, long monto, Instant fecha) { return firmar("PAG", numero, predio, monto, fecha.toEpochMilli()); }

    public String codigoDocumento(String consecutivo, String plantilla, String dirigidoA, Instant emitido) {
        return firmar("DOC", consecutivo, plantilla, dirigidoA, LocalDate.ofInstant(emitido, FacturacionServicio.ZONA));
    }

    public static String normalizar(String c) {
        String x = c == null ? "" : c.toUpperCase().replaceAll("[^A-Z0-9]", "");
        return x.length() >= 8 ? x.substring(0, 4) + "-" + x.substring(4, 8) : x;
    }
}
