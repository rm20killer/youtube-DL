const fs = require("fs");
const ytdl = require("ytdl-core");
const ytfps = require("ytfps");
const config = require("./config.json");

//loop through the playlist and download each video as a sprate mp3 file
async function downloadPlaylist(playlist) {
  console.log("Downloading playlist...");
  console.log(playlist);
  let videos = playlist.videos;
  for (let i = 0; i < videos.length; i++) {
    //make folder for playlist based on playlist title
    if (!fs.existsSync(playlist.title)) {
      fs.mkdirSync(playlist.title);
    }
    //create info file for playlist
    if (!fs.existsSync(playlist.title + "/info.txt")) {
        fs.writeFileSync(
            playlist.title + "/info.txt",
            "Playlist Title: " + playlist.title + "\n" +
            "Playlist URL: " + playlist.url + "\n" +
            "Playlist ID: " + playlist.id + "\n\n\n"
        );
        
    }
    //get info for video
    let name = videos[i].title.replace(/[^\w\s]/gi, "");
    //if file already exists, skip
    if (fs.existsSync(playlist.title + "/" + name + ".mp3")) {
        console.log("File already exists, skipping...");
        //add to info file
        fs.appendFileSync(
            playlist.title + "/info.txt",
            name + " - " + videos[i].url + "- SKIPPED\n"
        );
          
        continue;
    }
    console.log("Info for video: " + videos[i].title);
    try {
      let info = await ytdl.getInfo(videos[i].id);
      if(!info) {
        console.log("Error getting info for video, skipping...");
        continue;
      }
      let audioFormats = ytdl.filterFormats(info.formats, "audioonly");
      console.log("Formats with only audio: " + audioFormats.length);
      let audio = audioFormats[0];
      console.log("Downloading: " + videos[i].title);
      await ytdl(videos[i].id, { format: audio }).pipe(
        fs.createWriteStream(playlist.title + "/" + name + ".mp3")
      );
      console.log("Downloaded: " + videos[i].title);
      //add to info file
      fs.appendFileSync(
          playlist.title + "/info.txt",
          name + " - " + videos[i].url + "\n"
      );
      console.log("Progress: " + ((i + 1) / videos.length) * 100 + "%");      
    } catch (error) {
      console.log("Error downloading video, skipping...");
      continue;
    }

  }
}

async function ytlist() {
  //Get url from config.json
  const url = config.url;
console.log(url);

  //get id from url
  const id = url.split("list=")[1].split("&")[0];
  //get playlist
  ytfps(id)
    .then((playlist) => {
      downloadPlaylist(playlist);
    })
    .catch((err) => {
      handle_error(err);
    });
}

ytlist(URL);
