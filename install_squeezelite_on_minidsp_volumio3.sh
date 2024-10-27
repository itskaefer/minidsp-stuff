#!/bin/bash
pluginName="squeezelite_mc"
url="https://github.com/itskaefer/minidsp-stuff/raw/refs/heads/main/$pluginName.zip"


cd ~
mkdir $pluginName
cd $pluginName
busybox unzip $pluginName.zip

sudo mkdir -p /data/plugins/music_service/$pluginName
sudo chown volumio:volumio /data/plugins/music_service/$pluginName

volumio plugin refresh
cd /data/plugins/music_service/$pluginName
sudo npm install
sudo ./install.sh  

