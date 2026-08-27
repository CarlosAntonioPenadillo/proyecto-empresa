import { Link } from "@tanstack/react-router";
import { Upload, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title = "No hay datos cargados",
  description = "Sube tu archivo CSV para comenzar el análisis financiero y utilizar los modelos de Machine Learning y Deep Learning.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="surface-panel flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
        <FileWarning className="size-6" />
      </span>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild size="lg">
        <Link to="/datos">
          <Upload className="size-4" />
          Subir CSV
        </Link>
      </Button>
    </div>
  );
}
