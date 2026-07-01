; One-click launcher cho Aurora.
; Nhung nguoi khong ranh ky thuat chi can double-click DUY NHAT 1 file nay:
; no tu giai nen file cai dat NSIS goc cua Tauri (da nhung san ben trong)
; va chay o che do passive (/P) -> khong hien wizard nhieu buoc, chi hien
; 1 thanh tien trinh nho, xong tu mo lai Aurora (/R).
;
; Build bang: makensis /DINSTALLER_PATH=<duong dan setup.exe goc> /DOUT_FILE=<ten file xuat> launcher.nsi

Unicode true

!ifndef INSTALLER_PATH
  !error "Thieu /DINSTALLER_PATH=<duong dan den Aurora_x.y.z_x64-setup.exe>"
!endif

!ifndef OUT_FILE
  !define OUT_FILE "Cai-dat-Aurora.exe"
!endif

Name "Aurora"
OutFile "${OUT_FILE}"
Icon "..\icons\icon.ico"
RequestExecutionLevel user
SilentInstall silent
ShowInstDetails nevershow

Section
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File /oname=AuroraSetup.exe "${INSTALLER_PATH}"

  ; /P  = passive: bo qua toan bo cac trang wizard, chi hien progress bar
  ; /R  = tu mo lai Aurora sau khi cai xong
  ExecWait '"$PLUGINSDIR\AuroraSetup.exe" /P /R'
SectionEnd
