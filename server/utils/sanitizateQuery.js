module.exports = (query) => {
  return query
    .toString()
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;")
    .replace(/"/g, "&#34;");
};

//use this on client

/**
    "":{
        "iso":{
            "country":"",
            "nation":""
        }
    },
 */
