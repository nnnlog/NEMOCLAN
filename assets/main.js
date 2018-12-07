function getURL(type) {
    return location.protocol + "//" + location.host + type;
}

async function updateClickedButton_menu(element) {
    element.classList.add("active");

    let e = document.getElementById("menuList"), index = 0;
    for (let i = 0; i < e.childNodes.length; i++) {
        if (e.childNodes[i].id !== element.id && e.childNodes[i].id !== undefined) {
            e.childNodes[i].classList.remove("active");
        }else{
            if (e.childNodes[i].id === element.id) {
                index = i;
            }
        }
    }

    e = document.getElementById("articleList");
    for (let i = 0; i < e.childNodes.length; i++) {
        if (e.childNodes[i].style !== undefined) {
            if (i !== index) {
                e.childNodes[i].style.display = "none";
            }else{
                e.childNodes[i].style.display = "block";
            }
        }
    }


}