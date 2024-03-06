$(window).on("load", function() {
    //- Called when green submission is clicked.
    $("#simulation button.ui.large.button.green").on('click', function(e) {
        e.preventDefault();
        // Disable green button.
        $("button.ui.large.button.green").addClass("disabled");
        $("button.ui.large.button.green").text("Generating Code...");

        // Clear any displayed results.
        $("#loaded-results").hide();
        $("#results").hide();
        $("#no-results").hide();
        $("#relevantFiles").empty();
        $("#implementationPlan").empty();
        $("#steps").empty();

        // Disable form inputs. 
        $("#simulation .field").addClass("disabled");

        // Display loader. 
        $("#loading-results").show();

        // Get form inputs. 
        const prompt = $("#simulation #prompt").val() ||
            "Add a grey box above each comment box in actor post. The grey box include a feeling prompt question: 'How is Jane Done feeling?'. Each prompt was customized by the poster's name.";
        const investment = parseFloat($("#simulation #investment").val()) || 20.0;
        const n_round = parseInt($("#simulation #n_round").val()) || 5;

        // Call MetaGPT system
        $.get("/generateInterfaceChange", { prompt: prompt, investment: investment, n_round: n_round }, function(data) {
            let rawResult = data["result"];

            // Clean data
            rawResult = rawResult.replace(/\r\n/g, ""); // remove new lines

            const regex = /(?<=\[CONTENT\]).*?(?=\[\/CONTENT\])/gm;
            let result = rawResult.match(regex) || [];
            if (result) {
                result = result.map(r => JSON.parse(r.trim()));
            }

            console.log(result);


            // Display prompt, investment, round input values.
            $("p#prompt").text(prompt);
            $("p#investment").text(investment);
            $("p#n_round").text(n_round);

            // Prefill form with prompt, investment, round input values.
            $("#simulation #prompt").val(prompt);
            $("#simulation #investment").val(investment);
            $("#simulation #n_round").val(n_round);

            // No output.
            if (result.length == 0) {
                $("#no-results").show();
            } // output.
            else {
                const relevantFiles = result[0]["Relevant Files"];
                for (const file of relevantFiles) {
                    const elementToAppend = `<p>${file}</p>`;
                    $("#relevantFiles").append(elementToAppend);
                }

                const implementationPlan = result[0]["Implementation Plan"];
                for (const step of implementationPlan) {
                    const elementToAppend = `<li>${step[1]}</li>`;
                    $("#implementationPlan").append(elementToAppend);
                }

                for (let i = 1; i < result.length; i++) {
                    let elementToAppend = `<h3> Implementing ${i}. </h3>`;

                    for (const step in result[i]) {
                        elementToAppend += `<h4> ${step} </h4>`;
                        if (Array.isArray(result[i][step])) {
                            for (const step2 in result[i][step]) {
                                elementToAppend += `<h4> ${step2} </h4> <p>${result[i][step][step2].replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>`;
                            }
                        } else {
                            elementToAppend += `<p>${result[i][step].replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>`;
                        }
                    }
                    $("#steps").append(elementToAppend);
                }
                $("#results").show();
            }
            $("#loading-results").hide();
            $("#loaded-results").show();

            // Enable form inputs. 
            $("#simulation .field").removeClass("disabled");

            // Enable green button.
            $("button.ui.large.button.green").removeClass("disabled");
            $("button.ui.large.button.green").text("Submit");
        });
    });
});