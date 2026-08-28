/**
 * Formato mínimo de dispositivo usado pelo seletor de atribuição de
 * dispositivos do formulário de Ambiente. Deliberadamente não é o `Device`
 * da feature `devices` (isolamento do FSD — mesmo padrão do `PickerDevice`
 * em `device-groups.types.ts`). `type`/`integrationType` ficam como
 * `number` cru (espelham o `DeviceTypeEnum`/`IntegrationTypeEnum` do C#,
 * ver `devices.types.ts` na feature `devices`) — não reimportamos o enum
 * pra não acoplar as duas features.
 */
export interface RoomPickerDevice {
	id: string;
	name: string;
	brand: string;
	externalId: string;
	type: number;
	integrationType: number;
	roomId: string | null;
	isOnline: boolean;
	isOn: boolean;
}

/**
 * Payload mínimo aceito por `PUT /devices/{id}` (UpdateDeviceRequest no C#)
 * pra realocar um dispositivo de ambiente. Campos sensíveis/de rede
 * (ipAddress, macAddress, localKey, etc.) ficam de fora — o back-end
 * preserva o valor já salvo quando o campo não é enviado, não apaga.
 */
export interface RoomDeviceAssignmentPayload {
	name: string;
	brand: string;
	externalId: string;
	type: number;
	integrationType: number;
	roomId: string | null;
}
