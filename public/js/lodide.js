//Utility functions
//From http://www.jquerybyexample.net/2012/06/get-url-parameters-using-jquery.html
function getURLParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] === sParam) {
            return sParameterName[1];
        }
    }
}
;

function ampDecode(encoded) {
    var elem = document.createElement('textarea');
    elem.innerHTML = encoded;
    return elem.value;
}

$(function () {
    var gh = null;
    var profile;

    var exerciseParam = getURLParameter("exercise");
    if (exerciseParam) {
        $("#exercise").attr("resource", exerciseParam);
    }

    LD2h.expand().then(function () {


        /*var sourceUriValue = $("#sourceURI").val();
        if (sourceUriValue && (sourceUriValue.trim().length > 0)) {
            setRdfSourceType("uri");
        }*/

        var codeEditorValue = ampDecode($("#codeEditor").html());
        $("#codeEditor").html("");
        var codeEditorCM = CodeMirror($("#codeEditor")[0], {
            mode: "javascript"
        });
        if (codeEditorValue) {
            codeEditorCM.setValue(codeEditorValue);
        }
        var matchersEditorValue = ampDecode($("#matchersEditor").html());
        $("#matchersEditor").html("")
        var matchersEditorCM = CodeMirror($("#matchersEditor")[0], {
            mode: "turtle"
        });
        if (matchersEditorValue) {
            matchersEditorCM.setValue(matchersEditorValue);
        }
        var run = function () {
            if ($("#sourceURI").val() !== "") {
                var sourceURI = $("#sourceURI").val();
            } else {
                var sourceURI = $("#endpointURL").val() + "?query=" + encodeURIComponent($("#queryForEndpoint").val()) + "&format=auto";
            }
            var turtleParser = LdpStore.parsers.findParsers("text/turtle")[0];
            var store = new LdpStore({
                parsers: new LdpStore.ParserUtil({
                    'text/turtle': turtleParser,
                    //'application/ld+json': LdpStore.parsers.findParsers("application/ld+json")[0],
                    'application/rdf+xml': LdpStore.parsers.findParsers("application/rdf+xml")[0]
                })
            });
            var getData = function () {
                if ($('#rdfSource-uri').is(":visible") || $('#rdfSource-sparql').is(":visible")) {
                    return store.match(
                            null,
                            null,
                            null,
                            sourceURI).catch(
                            function (error) {
                                console.warn("Couldn't get any triple from " + sourceURI + ". reason: " + error);
                            });

                } else {
                    var turtle = rdfDataEditorCM.getValue();
                    return turtleParser.parse(turtle, undefined, "http://example.org/").catch(function (e) {
                        console.log(e);
                        alert("Could not parse Turtle: " + e.constructor.name);
                        throw "Parsing failed";
                    });
                }
            };
            getData().then(function (g) {
                var code = codeEditorCM.getValue();
                var runCode = new Promise(function (resolve, reject) {
                    try {
                        var result = eval(code);
                    } catch (e) {
                        if ((e instanceof ReferenceError) ||
                                (e instanceof SyntaxError) ||
                                (e instanceof TypeError)) {
                            alert(e.constructor.name +
                                    (e.lineNumber ? " on line " + e.lineNumber : "") +
                                    ": " + e.message);
                        } else {
                            throw(e);
                        }
                    }
                    //if code result in undefined it will immediately be resolves
                    //if it returns a promise it will follow that promise
                    resolve(result);
                });
                runCode.then(function () {
                    var resource = rdf.createNamedNode($("#rendering-resource").val());
                    var matchersTurtle = matchersEditorCM.getValue();
                    if (matchersTurtle.length > 0) {
                        turtleParser.parse(matchersTurtle).then(function (matchers) {
                            var renderingResult = new RDF2h(matchers).render(
                                    g, resource);
                            $("#result").html(renderingResult);
                        });
                    }
                });
            });
        };
        $("#run").on("click", run);

        $(".source-solution-button").on("click", function () {
            var type = $("#sourceType-solution").val();
            if (type === "http://ontology.lodide.io/resourceSource") {
                if (confirm("Confirm that you are you too lazy to copy and paste that URI.")) {
                    $("#sourceURI").val($("#sourceURI-solution").text().trim());
                    setRdfSourceType("uri");
                }
            }
            if (type === "http://ontology.lodide.io/codeSource") {
                rdfDataEditorCM.setValue($("#sourceEditor-solution").val().trim());
                setRdfSourceType("directInput");
            }
            if (type === "http://ontology.lodide.io/sparqlSource") {
                $("#endpointURL").val($("#sourceURI-solution").text().trim());
                sparqlEditorCM.setValue($("#sourceEditor-solution").val().trim());
                setRdfSourceType("sparql");
            }
        });
        $("#codeEditor-solution-button").on("click", function () {
            var message = "Confirm that you would like to see the solution.";
            if (codeEditorCM.getValue().trim().length > 0) {
                message += "\nWARNING: The code that you've already entered will be gone forever.";
            }
            if (confirm(message)) {
                codeEditorCM.setValue($("#codeEditor-solution").val().trim());
            }
        });
        $("#rendering-solution-button").on("click", function () {
            var message = "Confirm that you would like to see the solution.";
            if (matchersEditorCM.getValue().trim().length > 0) {
                message += "\nWARNING: That code that you've already entered will be forever lost.";
            }
            if (confirm(message)) {
                $("#rendering-resource").val($("#rendering-resource-solution").text().trim());
                matchersEditorCM.setValue($("#matchersEditor-solution").val().trim());
            }
        });



        updateLogginStatus();


        function updateLogginStatus() {
            if (profile) {
                $('.authenticatedOnly').show();
                $('#login-div').html('<img src="' + profile.avatar_url + ' width="20" height="20" />Logged in as ' + profile.login + ' (<a id="logout-link" href="#login">Logout</a>)');
                $('#logout-link').click(function () {
                    profile = null;
                    updateLogginStatus();
                    return false;
                });
                var repo = gh.getRepo(profile.login, 'lodide-saved-contents');
                repo.getTree("master").then(function (r) {
                    console.log("successful access to your repo");
                }).catch(function (e) {
                    console.log("failed to access repo contents, will attempt to create repo");
                    console.log(e);
                    //create new repository
                    gh.getUser().createRepo({
                        "name": "lodide-saved-contents",
                        "description": "A repository for saving http://lodide.io/ projects.",
                        "homepage": "http://lodide.io/",
                        "private": false,
                        "has_issues": false,
                        "has_wiki": false,
                        "has_downloads": false
                    }).then(writeReadme)
                        .catch(function (a) {
                            alert("error: " + a)
                        });
                    function writeReadme() {
                        repo.writeFile('master', "README.md", "# LodIDE\nThis repository collects all your saved work from [LodIDE](http://lodide.io).",
                                "Autogenerated README", {}).then(function (r) {
                            console.log(r);
                        });
                    }
                });
            } else {
                $('.authenticatedOnly').hide();
                $('#login-div').html('<a id="login-link" href="#login">Login with GitHub</a>');
                $('#login-link').click(function () {
                    $('#login-dialog').modal("show");
                    return false;
                });
            }
        }

        var loginButtonAction = function (auth) {
            gh = new GitHub(auth);
            var user = gh.getUser();
            console.log(user);
            user.getProfile().then(function (response) {
                profile = response.data;
                console.log(profile);
                updateLogginStatus();
                $('#login-dialog').modal('hide');
            });


        }

        $('#personalAccessTokenLoginButton').click(function () {
            if ($('#saveCredentialForLater').prop("checked")) {
                localStorage.setItem("personalAccessToken", $('#personalAccessToken').val());
            } else {
                localStorage.removeItem("personalAccessToken");
            }
            loginButtonAction({
                token: $('#personalAccessToken').val(),
            });
        });

        $('#passwordLoginButton').click(function () {
            loginButtonAction({
                'username': $('#userName').val(),
                'password': $('#password').val()
            });
        });

        $("#saveButton").click(function () {
            $("#fileNameDialog").modal("show");
        });

        $("#saveButton2").click(function () {
            var fileName = $("#fileName").val();
            if (!fileName.endsWith(".ttl")) {
                fileName = fileName + ".ttl";
            }
            var repo = gh.getRepo(profile.login, 'lodide-saved-contents');
            repo.listBranches().then(writeFile).catch(function (e) {
                alert("failed to write file, did you delete the repo? Will attempt to create repo.");
                console.log(e);
                //create new repository
                gh.getUser().createRepo({
                    "name": "lodide-saved-contents",
                    "description": "A repository for saving http://lodide.io/ projects.",
                    "homepage": "http://lodide.io/",
                    "private": false,
                    "has_issues": false,
                    "has_wiki": false,
                    "has_downloads": false
                }).then(writeFile)
                        .catch(function (a) {
                            alert("error: " + a)
                        });
            });
            function writeFile() {
                serializeCurrentState().then(function (fileContent) {
                    repo.writeFile('master', fileName, fileContent,
                            "Run it on http://lodide.io/?exercise=https://raw.githubusercontent.com/" + profile.login + "/lodide-saved-contents/master/" + fileName, {}).then(function (r) {
                        alert("saved file: " + fileName);
                        console.log(r);
                    });
                }).catch(function (e) {
                    console.log("Error serializing:");
                    console.log(e);
                    alert("Serialization failed, see log");
                });
            }
            function serializeCurrentState() {
                var g = new rdf.Graph();
                var exercise = rdf.createNamedNode(""); //rdf-ext supports relative IRIs
                g.add(rdf.createTriple(exercise, rdfNs("type"), lodIdeNs("Exercise")));
                g.add(rdf.createTriple(exercise, lodIdeNs("intro"), rdf.createLiteral($("#intro").html())));
                g.add(rdf.createTriple(exercise, lodIdeNs("finalWords"),
                        rdf.createLiteral($("#finalWords").html())));
                var dataSource = rdf.createBlankNode();
                g.add(rdf.createTriple(exercise, lodIdeNs("dataSource"), dataSource));
                if ($("#dataSource-taskDescription").length > 0) {
                    g.add(rdf.createTriple(dataSource, lodIdeNs("taskDescription"),
                            rdf.createLiteral($("#dataSource-taskDescription").html())));
                }
                if ($("#sourceURI-solution").html()) {
                    g.add(rdf.createTriple(dataSource, lodIdeNs("taskSolutionResource"),
                            rdf.createNamedNode($("#sourceURI-solution").html())));
                }
                if ($('#rdfSource-uri').is(":visible")) {
                    g.add(rdf.createTriple(dataSource, lodIdeNs("taskSolutionResourceCurrent"),
                            rdf.createLiteral($("#sourceURI").val())));
                }
                if ($("#sourceEditor-solution").val()) {
                    g.add(rdf.createTriple(dataSource, lodIdeNs("taskSolutionCode"),
                            rdf.createLiteral($("#sourceEditor-solution").val())));
                }
                if ($('#rdfSource-directInput').is(":visible")) {
                    g.add(rdf.createTriple(dataSource, lodIdeNs("taskSolutionCodeCurrent"),
                            rdf.createLiteral(rdfDataEditorCM.getValue())));
                }
                var dataProcessing = rdf.createBlankNode();
                g.add(rdf.createTriple(exercise, lodIdeNs("dataProcessing"), dataProcessing));
                if ($("#dataProcessing-taskDescription").length > 0) {
                    g.add(rdf.createTriple(dataProcessing, lodIdeNs("taskDescription"),
                            rdf.createLiteral($("#dataProcessing-taskDescription").html())));
                }
                if ($("#codeEditor-solution").val().length > 0) {
                g.add(rdf.createTriple(dataProcessing, lodIdeNs("taskSolutionCode"),
                        rdf.createLiteral($("#codeEditor-solution").val())));
                }
                g.add(rdf.createTriple(dataProcessing, lodIdeNs("taskSolutionCodeCurrent"),
                        rdf.createLiteral(codeEditorCM.getValue())));
                if ($("#dataRenderingTitle").length > 0) {
                    var dataRendering = rdf.createBlankNode();
                    g.add(rdf.createTriple(exercise, lodIdeNs("dataRendering"), dataRendering));
                    if ($("#dataRendering-taskDescription").length > 0) {
                        g.add(rdf.createTriple(dataRendering, lodIdeNs("taskDescription"),
                                rdf.createLiteral($("#dataRendering-taskDescription").html())));
                    }
                    g.add(rdf.createTriple(dataRendering, lodIdeNs("taskSolutionCode"),
                            rdf.createLiteral($("#matchersEditor-solution").val())));
                    g.add(rdf.createTriple(dataRendering, lodIdeNs("taskSolutionCodeCurrent"),
                            rdf.createLiteral(matchersEditorCM.getValue())));
                    g.add(rdf.createTriple(dataRendering, lodIdeNs("taskSolutionResource"),
                            rdf.createNamedNode($("#rendering-resource-solution").html())));
                    g.add(rdf.createTriple(dataRendering, lodIdeNs("taskSolutionResourceCurrent"),
                            rdf.createLiteral($("#rendering-resource").val())));
                }
                return rdf.serializers["text/turtle"].serialize(g).then(function (turtle) {
                    return turtle;
                });
            }
            function lodIdeNs(localName) {
                return rdf.createNamedNode("http://ontology.lodide.io/" + localName);
            }
            function rdfNs(localName) {
                return rdf.createNamedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#" + localName);
            }
        });


        $(".exerciseIndexLink").click(function (e) {
            var exerciseArea = $("#exercise");
            exerciseArea.hide();
            var exerciseIndexArea = $("#exerciseIndex");

            if (exerciseIndexArea.is(":visible")) {
                exerciseIndexArea.addClass("fetch");
                exerciseIndexArea.attr("resource", "index.ttl");
                LD2h.expand();
            } else {
                exerciseIndexArea.show();
            }
            window.previousLocation = window.location.toString();
            window.history.pushState({}, "", "exercise-index.html");
            $("#lodIDEMenu").removeClass("active");
            $("#exerciseIndexMenu").addClass("active");
            e.preventDefault();
        });

        $(".lodIDELink").click(function () {
            var exerciseArea = $("#exercise");
            exerciseArea.show();
            var exerciseIndexArea = $("#exerciseIndex");
            exerciseIndexArea.hide();
            window.history.pushState({}, "", window.previousLocation);
            $("#lodIDEMenu").addClass("active");
            $("#exerciseIndexMenu").removeClass("active");
        });

    });

});
