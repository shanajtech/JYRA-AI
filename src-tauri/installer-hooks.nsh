; Large offline models are distributed beside the setup executable so they do
; not exceed NSIS's embedded-data limits. No account data is touched.
!macro NSIS_HOOK_PREINSTALL
  IfFileExists "$EXEDIR\JYRA-offline-model.gguf" jyra_model_present
  MessageBox MB_OK|MB_ICONSTOP "Keep JYRA-offline-model.gguf in the same folder as this installer, then run setup again."
  Abort
  jyra_model_present:
!macroend

!macro NSIS_HOOK_POSTINSTALL
  CreateDirectory "$INSTDIR\resources\models"
  ClearErrors
  CopyFiles /SILENT "$EXEDIR\JYRA-offline-model.gguf" "$INSTDIR\resources\models"
  IfErrors jyra_model_copy_failed jyra_model_copy_done
  jyra_model_copy_failed:
  MessageBox MB_OK|MB_ICONSTOP "The offline model could not be copied. Check free disk space and run setup again."
  Abort
  jyra_model_copy_done:
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  Delete "$INSTDIR\resources\models\JYRA-offline-model.gguf"
  RMDir "$INSTDIR\resources\models"
!macroend
