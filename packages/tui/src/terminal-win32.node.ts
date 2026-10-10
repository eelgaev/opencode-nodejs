// Linux and other non-Windows Node hosts do not need Windows console mode FFI.
export function win32DisableProcessedInput() {}
export function win32FlushInputBuffer() {}
export function win32InstallCtrlCGuard() {}
