import { Trash2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import { useDeleteRoom } from "../hooks/useDeleteRoom";
import { useRoomsUIStore } from "../store/rooms-ui.store";

/**
 * Confirmação de exclusão de ambiente — `useDeleteRoom` já existia
 * (soft delete real via `DELETE /rooms/{id}`), só trocamos o `confirm()`
 * nativo por este `AlertDialog`.
 */
export function DeleteRoomAlertDialog() {
	const deletingRoom = useRoomsUIStore((s) => s.deletingRoom);
	const closeDeleteDialog = useRoomsUIStore((s) => s.closeDeleteDialog);
	const { mutate: deleteRoom } = useDeleteRoom();

	return (
		<AlertDialog
			open={Boolean(deletingRoom)}
			onOpenChange={(open) => {
				if (!open) closeDeleteDialog();
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Excluir ambiente</AlertDialogTitle>
					<AlertDialogDescription>
						Tem certeza que deseja excluir o ambiente "{deletingRoom?.name}"? Os
						dispositivos vinculados a ele ficam sem ambiente atribuído — a
						exclusão não apaga os dispositivos nem o histórico deles.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => {
							if (deletingRoom) deleteRoom(deletingRoom.id);
						}}
					>
						<Trash2 className="h-3.5 w-3.5" />
						Excluir
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
