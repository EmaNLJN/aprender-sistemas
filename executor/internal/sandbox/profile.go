package sandbox

import "time"

const outputLimit = 64 << 10

// Profiles devuelve los límites del ADR 0005 por lenguaje. La compilación escribe el binario
// en /out; la ejecución lo corre con rootfs y /out de sólo lectura.
func Profiles(rustImage, goImage string) map[string]Profile {
	run := Phase{
		Timeout: 10 * time.Second, MemoryMiB: 256, Pids: 64, TmpfsMiB: 16, CPUs: "1",
		ReadOnly: true, OutReadOnly: true, Cmd: []string{"/out/main"},
	}
	return map[string]Profile{
		"rust": {
			Image: rustImage,
			Compile: Phase{
				Timeout: 20 * time.Second, MemoryMiB: 1024, Pids: 256, TmpfsMiB: 256, CPUs: "2",
				ReadOnly: true,
				// --crate-type bin manda sobre un #![crate_type] del alumno (el harness pone su
				// código al principio del archivo): la compilación deja un ejecutable o falla.
				Cmd: []string{"sh", "-c",
					"cat > /tmp/main.rs && rustc --edition 2024 --crate-type bin /tmp/main.rs -o /out/main"},
			},
			Run:         run,
			OutputLimit: outputLimit,
		},
		"go": {
			Image: goImage,
			// Sin --read-only: go build escribe en el GOCACHE precalentado de la imagen, en la
			// capa del contenedor, que se descarta al borrarlo. go vet es informativo: como en el
			// Playground, corre sólo si compiló y nunca cambia el código de salida.
			// -buildmode=exe convierte un paquete que no es main en un error de compilación.
			Compile: Phase{
				Timeout: 15 * time.Second, MemoryMiB: 1024, Pids: 256, TmpfsMiB: 256, CPUs: "2",
				ReadOnly: false,
				Cmd: []string{"sh", "-c",
					"mkdir -p /tmp/src && cat > /tmp/src/main.go && cd /tmp/src && " +
						"go build -buildmode=exe -o /out/main main.go && { go vet main.go || true; }"},
			},
			Run:         run,
			OutputLimit: outputLimit,
		},
	}
}
