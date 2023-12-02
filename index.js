const fs = require("fs");
const ytdl = require("ytdl-core");
const ytfps = require("ytfps");
const config = require("./config.json");
const ffmpeg = require('fluent-ffmpeg');
const NodeID3  = require('node-id3');


//loop through the playlist and download each video as a sprate mp3 file
async function downloadPlaylist(playlist) {
  let ErrorsCount = 0;
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
      // console.log(audioFormats);
      // console.log("Formats with only audio: " + audioFormats.length);
      //get audio where container: 'mp4'
      let MP3audioFormats = audioFormats.filter((format) => format.container === 'mp4');
      // console.log("Formats with mp4 container: " + MP3audioFormats.length);
      let audio = MP3audioFormats[0];
      if(!audio) {
        console.log("Error getting audio format, Trying opus ...");
        audio = audioFormats[0];
        //check if audio is opus
        if(audio.codecs != "opus") {
          console.log("Error getting audio format, skipping...");
          continue;
        }
      }
      //extention is M4A for mp3 and opus for opus      console.log("Downloading: " + videos[i].title);

      let stream = ytdl(videos[i].id, { format: audio, quality: 'highestaudio' });
      let start = Date.now();
      await ffmpeg(stream)
      .audioBitrate(128)
      .save(`${playlist.title}/${name}.mp3`)
      .on('end', () => {
        console.log(`Done ${name} - ${(Date.now() - start) / 1000}s`);
        console.log("Progress: " + ((i + 1) / videos.length) * 100 + "%");
        try{
          //using node-id3 to add metadata to file
          let tags = {
            title: name,
            artist: videos[i].author.name,
            album: playlist.title,
            TRCK: i+1,
            encodedBy: 'rm20killer/youtube-DL',
            artistUrl: videos[i].url,
          }
          let success = NodeID3.write(tags, `${playlist.title}/${name}.mp3`);
          console.log(success);
  
        } catch (error) {
          console.log(`Error adding metadata to file for ${name}`);
          // console.log(error);
          return;
        }
        //add to info file
        fs.appendFileSync(
          playlist.title + "/info.txt",
          name + " - " + videos[i].url + "\n"
        );
      })
      .on('error', (err) => {
        // console.log('error: ', err);
        console.log(`Error converting ${name}, skipping...`);
      });

      // await ytdl(videos[i].id, { format: audio }).pipe(
      //   fs.createWriteStream(playlist.title + "/" + name + extention)
      // ).on("finish", () => {
      //     console.log("Finished downloading: " + videos[i].title);
      //     //add to info file
      //     fs.appendFileSync(
      //         playlist.title + "/info.txt",
      //         name + " - " + videos[i].url + "\n"
      //     );
      //     console.log("Progress: " + ((i + 1) / videos.length) * 100 + "%");     
      // }); 
    } catch (error) {
      console.log("Error downloading video, skipping...");
      fs.appendFileSync(
        playlist.title + "/info.txt",
        name + " - " + videos[i].url + "- ERROR\n"
      );
      ErrorsCount++;
      continue;
    }
    console.log("error count = " + ErrorsCount);
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
