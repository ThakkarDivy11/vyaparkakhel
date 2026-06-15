Add-Type -AssemblyName 'System.Windows.Forms'

# Extract board_space.rtf
$rtf1 = [System.IO.File]::ReadAllText('c:\Users\Commerciax-hp-victus\Desktop\Divy Work\vyaparkakhel.com\board_space.rtf')
$rtb1 = New-Object System.Windows.Forms.RichTextBox
$rtb1.Rtf = $rtf1
$rtb1.Text | Out-File -FilePath 'c:\Users\Commerciax-hp-victus\Desktop\Divy Work\vyaparkakhel.com\board_space_extracted.txt' -Encoding UTF8

# Extract board.rtf
$rtf2 = [System.IO.File]::ReadAllText('c:\Users\Commerciax-hp-victus\Desktop\Divy Work\vyaparkakhel.com\board.rtf')
$rtb2 = New-Object System.Windows.Forms.RichTextBox
$rtb2.Rtf = $rtf2
$rtb2.Text | Out-File -FilePath 'c:\Users\Commerciax-hp-victus\Desktop\Divy Work\vyaparkakhel.com\board_extracted.txt' -Encoding UTF8

Write-Host "Done extracting RTF files"
