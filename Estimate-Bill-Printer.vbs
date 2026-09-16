Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
strDir = FSO.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = strDir
' 0 = Hide window completely (no black command prompt / terminal)
WshShell.Run """" & strDir & "\node_modules\electron\dist\electron.exe"" """ & strDir & """", 0, False
