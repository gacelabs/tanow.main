function showMessage($input, message, sClass, fnOptional) {
	if (sClass == undefined) sClass = 'error';
	const $group = $input.closest('.form-group').length ? $input.closest('.form-group') : $input.parent();
	if (typeof fnOptional == 'boolean' && fnOptional == true) {
		$input.prev().find('>div').stop().addClass(sClass);
	} else {
		$input.stop().addClass(sClass);
	}
	$group.find('.field-message').stop().addClass(sClass).text(message).show().delay(5000).fadeOut(1000, function () {
		if (typeof fnOptional == 'boolean' && fnOptional == true) {
			$input.prev().find('>div').removeClass(sClass);
		} else {
			$input.removeClass(sClass);
		}
		$group.find('.field-message').stop().hide().removeClass(sClass);
		if (typeof fnOptional === 'function') {
			fnOptional($input, message, sClass);
		}
	});
}

async function submitQuote(e, successCallback, errorCallback, optionalCallback) {
	const form = e.target;
	const formData = new FormData(form);
	formData.append('apiKey', 'sf_a1cl65640aa225d5ac63c196');

	if (typeof optionalCallback === 'function') {
		optionalCallback(formData);
	}

	const jsonObject = Object.fromEntries(formData.entries());
	// console.log('Form Data:', Object.fromEntries(formData.entries()));

	try {
		const response = await fetch('https://api.staticforms.dev/submit', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(jsonObject),
		});

		const result = await response.json();
		// console.log('API Response:', result);

		if (result.success || (result.message && result.message.toLowerCase().indexOf('successfully') !== -1)) {
			successCallback();
			form.reset();
		} else {
			if (result.error && result.error.toLowerCase().indexOf('captcha verification failed') !== -1) {
				$('.g-recaptcha > div').css({ border: '1px solid #DC3545' });
			}
			errorCallback('Error: ' + result.error || 'Failed to submit the form. Please try again later.');
		}
	} catch (error) {
		errorCallback('An error occurred while submitting the form. Please try again later.');
	}
}